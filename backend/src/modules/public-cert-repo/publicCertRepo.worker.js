'use strict';

const fs = require('fs');
const path = require('path');
const { db } = require('../../config/database');
const { isRedisAvailable } = require('../../config/redis');
const { uploadBufferToR2 } = require('../../utils/r2Storage');
const env = require('../../config/env');

// Dedicated queue — pushes pre-made image files from a local folder straight to R2, no
// template rendering or badge compositing (unlike 'bulk-certificate-upload'). Named distinctly
// so the two never share jobs.
const QUEUE_NAME = 'public-cert-repo-upload';
const R2_PREFIX = 'public-certificate-repo';
const CHUNK_SIZE = 5;

const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

let queue = null;

function redisConnection() {
  const redisUrl = new URL(env.REDIS_URL);
  return {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379', 10),
    password: redisUrl.password || undefined,
  };
}

function getQueue() {
  if (!queue) {
    const { Queue } = require('bullmq');
    queue = new Queue(QUEUE_NAME, {
      connection: redisConnection(),
      defaultJobOptions: { attempts: 1, removeOnComplete: 50, removeOnFail: 50 },
    });
  }
  return queue;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Uploads each matched row's local image to R2 under `public-certificate-repo/<ID>.<ext>`
 * and flips its certificate_repo_entries row to UPLOADED (or FAILED, with the error kept). Runs
 * in chunks of 5 concurrently — a ~2,000-file sheet awaited one-at-a-time would look hung.
 * Mirrors bulkUpload.service.js's processBulkUploadJob.
 */
async function processJob(job) {
  const { rows } = job.data;
  const total = rows.length;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (const batch of chunk(rows, CHUNK_SIZE)) {
    await Promise.allSettled(batch.map(async (row) => {
      try {
        const ext = path.extname(row.filePath).toLowerCase();
        const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
        const buffer = fs.readFileSync(row.filePath);
        const key = `${R2_PREFIX}/${row.offerLetterId}${ext}`;
        const url = await uploadBufferToR2(buffer, key, mime);
        await db.certificateRepoEntry.update({
          where: { offer_id: row.offerLetterId },
          data: {
            upload_status: 'UPLOADED',
            certificate_r2_key: key,
            certificate_url: url,
            certificate_file_name: `${row.offerLetterId}${ext}`,
            certificate_mime_type: mime,
            certificate_size: buffer.length,
            upload_error: null,
            uploaded_at: new Date(),
          },
        });
        succeeded += 1;
      } catch (err) {
        failed += 1;
        errors.push({ offerLetterId: row.offerLetterId, email: row.email, reason: err.message });
        await db.certificateRepoEntry.update({
          where: { offer_id: row.offerLetterId },
          data: { upload_status: 'FAILED', upload_error: err.message },
        }).catch(() => {});
      } finally {
        processed += 1;
      }
    }));
    await job.updateProgress({ total, processed, succeeded, failed, errors });
  }

  return { total, succeeded, failed, errors };
}

/**
 * Enqueues the job, or runs it inline when Redis/BullMQ is unavailable (same sync fallback as
 * bulkUpload.service.js) so the feature still works without Redis, just without a progress bar.
 */
async function addUploadJob({ rows }) {
  if (!isRedisAvailable()) {
    const result = await processJob({ data: { rows }, updateProgress: async () => {} });
    return { jobId: null, sync: true, result };
  }
  const job = await getQueue().add('upload', { rows }, { jobId: `pubcert-${require('crypto').randomUUID()}` });
  return { jobId: job.id, sync: false };
}

async function getUploadJobStatus(jobId) {
  const job = await getQueue().getJob(jobId);
  if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  const state = await job.getState();
  return {
    state,
    progress: job.progress && Object.keys(job.progress).length
      ? job.progress
      : { total: 0, processed: 0, succeeded: 0, failed: 0, errors: [] },
    result: job.returnvalue || null,
  };
}

function startPublicCertRepoWorker() {
  if (!isRedisAvailable()) {
    console.log('[Worker] Redis not available — public certificate repo worker skipped (sync fallback active)');
    return null;
  }
  try {
    const { Worker } = require('bullmq');
    const worker = new Worker(QUEUE_NAME, async (job) => processJob(job), {
      connection: redisConnection(),
      concurrency: 1,
    });
    worker.on('completed', (job, result) => {
      console.log(`Public certificate repo job ${job.id} completed: ${result?.succeeded}/${result?.total} uploaded`);
    });
    worker.on('failed', (job, err) => {
      console.error(`Public certificate repo job ${job?.id} failed:`, err.message);
    });
    console.log('Public certificate repo upload worker started');
    return worker;
  } catch (err) {
    console.error('Failed to start public certificate repo worker:', err.message);
    return null;
  }
}

module.exports = { addUploadJob, getUploadJobStatus, startPublicCertRepoWorker, R2_PREFIX };
