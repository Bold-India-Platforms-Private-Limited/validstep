'use strict';

const fs = require('fs');
const path = require('path');
const { isRedisAvailable } = require('../../config/redis');
const env = require('../../config/env');

// BullMQ Queue setup — separate queue from 'certificate-generation' since this processes
// pre-made files (badge-stamp + R2 upload only), not template rendering.
let bulkUploadQueue = null;

function getBulkUploadQueue() {
  if (!bulkUploadQueue) {
    const { Queue } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);
    bulkUploadQueue = new Queue('bulk-certificate-upload', {
      connection: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379'),
        password: redisUrl.password || undefined,
      },
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    });
  }
  return bulkUploadQueue;
}

const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' };
const CHUNK_SIZE = 5;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Processes the matched rows from admin.service.js's matchBulkCertificates() — reuses
 * uploadCustomCertificate() unchanged per row (badge stamp + R2 upload + DB update), just
 * reading the file off local disk instead of a multipart upload. Runs in chunks of 5
 * concurrently — sequential awaiting over hundreds of rows would make this feel hung, same
 * reasoning as admin.service.js's bulkUploadUsers.
 */
async function processBulkUploadJob(job) {
  const { rows } = job.data;
  const { uploadCustomCertificate } = require('../admin/admin.service');

  const total = rows.length;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (const batch of chunk(rows, CHUNK_SIZE)) {
    await Promise.allSettled(batch.map(async (row) => {
      try {
        const buffer = fs.readFileSync(row.filePath);
        const ext = path.extname(row.filePath).toLowerCase();
        const file = { buffer, mimetype: MIME_BY_EXT[ext] || 'application/octet-stream', originalname: path.basename(row.filePath) };
        await uploadCustomCertificate(row.orderId, file, {});
        succeeded += 1;
      } catch (err) {
        failed += 1;
        errors.push({ email: row.email, docId: row.docId, reason: err.message });
      } finally {
        processed += 1;
      }
    }));
    await job.updateProgress({ total, processed, succeeded, failed, errors });
  }

  return { total, succeeded, failed, errors };
}

/**
 * Enqueues the job, or — if Redis/BullMQ isn't available — runs it inline and returns the
 * finished result directly (mirrors the sync fallback in certificate.service.js's
 * addCertificateJob) so the feature still works without Redis, just without a progress bar.
 */
async function addBulkUploadJob({ batchId, rows }) {
  if (!isRedisAvailable()) {
    const result = await processBulkUploadJob({ data: { batchId, rows }, updateProgress: async () => {} });
    return { jobId: null, sync: true, result };
  }
  const queue = getBulkUploadQueue();
  const job = await queue.add('bulk-upload', { batchId, rows }, { jobId: `bulk-${require('crypto').randomUUID()}` });
  return { jobId: job.id, sync: false };
}

async function getBulkUploadJobStatus(jobId) {
  const queue = getBulkUploadQueue();
  const job = await queue.getJob(jobId);
  if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  const state = await job.getState();
  return {
    state,
    progress: job.progress && Object.keys(job.progress).length ? job.progress : { total: 0, processed: 0, succeeded: 0, failed: 0, errors: [] },
    result: job.returnvalue || null,
  };
}

function startBulkUploadWorker() {
  if (!isRedisAvailable()) {
    console.log('[Worker] Redis not available — bulk certificate upload worker skipped (sync fallback active)');
    return null;
  }
  try {
    const { Worker } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);

    const worker = new Worker(
      'bulk-certificate-upload',
      async (job) => processBulkUploadJob(job),
      {
        connection: {
          host: redisUrl.hostname,
          port: parseInt(redisUrl.port || '6379'),
          password: redisUrl.password || undefined,
        },
        concurrency: 1,
      }
    );

    worker.on('completed', (job, result) => {
      console.log(`Bulk certificate upload job ${job.id} completed: ${result?.succeeded}/${result?.total} succeeded`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Bulk certificate upload job ${job?.id} failed:`, err.message);
    });

    console.log('Bulk certificate upload worker started');
    return worker;
  } catch (err) {
    console.error('Failed to start bulk certificate upload worker:', err.message);
    return null;
  }
}

module.exports = { addBulkUploadJob, getBulkUploadJobStatus, startBulkUploadWorker };
