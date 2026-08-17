'use strict';

const { db } = require('../../config/database');
const { isRedisAvailable } = require('../../config/redis');
const { sendBatchAccessEmail } = require('../../utils/email');
const env = require('../../config/env');

// BullMQ Queue setup — separate queue from certificate generation/upload since this is a
// lightweight I/O-bound send, not image/PDF work.
let batchEmailQueue = null;

function getBatchEmailQueue() {
  if (!batchEmailQueue) {
    const { Queue } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);
    batchEmailQueue = new Queue('batch-access-email', {
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
  return batchEmailQueue;
}

const CHUNK_SIZE = 5;

// Keep sending inside a human-plausible pace rather than bursting — inbox providers and
// Brevo itself weigh sudden high-volume bursts heavily for spam scoring. Target 40-100/min
// (randomized per chunk so the pace isn't a suspiciously flat rate), plus a longer random
// cooldown every 80 sends to look like paced outreach rather than a mail blast.
const MIN_PER_MINUTE = 40;
const MAX_PER_MINUTE = 100;
const COOLDOWN_EVERY = 80;
const COOLDOWN_MIN_SECONDS = 30;
const COOLDOWN_MAX_SECONDS = 160;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends the account-access + verification-link email to every given order's user. Orders
 * whose certificate isn't issued yet are skipped (there's no verification link to send) and
 * reported back rather than silently dropped — same "skip and report" convention as the bulk
 * certificate upload. Runs in chunks of 5 concurrently, paced to stay within MIN/MAX_PER_MINUTE
 * with a longer randomized cooldown every COOLDOWN_EVERY sends, so a large batch doesn't send
 * as one suspicious burst.
 */
async function processBatchEmailJob(job) {
  const { orderIds } = job.data;

  const orders = await db.order.findMany({
    where: { id: { in: orderIds } },
    include: {
      user: { select: { name: true, email: true } },
      certificate: { select: { is_issued: true, verification_code: true, verification_hash: true } },
      batch: {
        select: {
          name: true, role: true, start_date: true, end_date: true,
          program: { select: { type: true } },
          company: { select: { name: true } },
        },
      },
    },
  });

  const total = orders.length;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let sentSinceCooldown = 0;
  const errors = [];
  const chunks = chunk(orders, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const batchChunk = chunks[i];
    await Promise.allSettled(batchChunk.map(async (order) => {
      try {
        if (!order.certificate?.is_issued) {
          throw new Error('Certificate not yet issued — nothing to verify/download yet');
        }
        const code = order.certificate.verification_code || order.certificate.verification_hash;
        await sendBatchAccessEmail({
          userName: order.user.name,
          userEmail: order.user.email,
          companyName: order.batch.company.name,
          programType: order.batch.program.type,
          batchName: order.batch.name,
          role: order.batch.role,
          startDate: order.batch.start_date,
          endDate: order.batch.end_date,
          verificationUrl: `${env.FRONTEND_URL}/verify/${code}`,
          loginUrl: `${env.FRONTEND_URL}/auth/user/login`,
        });
        succeeded += 1;
        sentSinceCooldown += 1;
      } catch (err) {
        failed += 1;
        errors.push({ email: order.user.email, reason: err.message });
      } finally {
        processed += 1;
      }
    }));
    await job.updateProgress({ total, processed, succeeded, failed, errors, pacing: null });

    const isLastChunk = i === chunks.length - 1;
    if (isLastChunk) break;

    if (sentSinceCooldown >= COOLDOWN_EVERY) {
      sentSinceCooldown = 0;
      const cooldownSeconds = randomInt(COOLDOWN_MIN_SECONDS, COOLDOWN_MAX_SECONDS);
      const resumeAt = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
      await job.updateProgress({ total, processed, succeeded, failed, errors, pacing: { cooling_down: true, seconds: cooldownSeconds, resume_at: resumeAt } });
      await sleep(cooldownSeconds * 1000);
      await job.updateProgress({ total, processed, succeeded, failed, errors, pacing: null });
    } else {
      // Per-chunk pacing delay, randomized within the bound that keeps the effective rate
      // between MIN_PER_MINUTE and MAX_PER_MINUTE for a CHUNK_SIZE-sized batch.
      const minDelayMs = (CHUNK_SIZE / MAX_PER_MINUTE) * 60000;
      const maxDelayMs = (CHUNK_SIZE / MIN_PER_MINUTE) * 60000;
      await sleep(randomInt(minDelayMs, maxDelayMs));
    }
  }

  return { total, succeeded, failed, errors };
}

/**
 * Enqueues the job, or — if Redis/BullMQ isn't available — runs it inline and returns the
 * finished result directly, mirroring the sync fallback used elsewhere (addCertificateJob,
 * addBulkUploadJob) so the feature still works without Redis, just without a progress bar.
 */
async function addBatchEmailJob({ batchId, orderIds }) {
  if (!isRedisAvailable()) {
    const result = await processBatchEmailJob({ data: { batchId, orderIds }, updateProgress: async () => {} });
    return { jobId: null, sync: true, result };
  }
  const queue = getBatchEmailQueue();
  const job = await queue.add('batch-access-email', { batchId, orderIds }, { jobId: `batch-email-${require('crypto').randomUUID()}` });
  return { jobId: job.id, sync: false };
}

async function getBatchEmailJobStatus(jobId) {
  const queue = getBatchEmailQueue();
  const job = await queue.getJob(jobId);
  if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  const state = await job.getState();
  return {
    state,
    progress: job.progress && Object.keys(job.progress).length ? job.progress : { total: 0, processed: 0, succeeded: 0, failed: 0, errors: [], pacing: null },
    result: job.returnvalue || null,
  };
}

function startBatchEmailWorker() {
  if (!isRedisAvailable()) {
    console.log('[Worker] Redis not available — batch email worker skipped (sync fallback active)');
    return null;
  }
  try {
    const { Worker } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);

    const worker = new Worker(
      'batch-access-email',
      async (job) => processBatchEmailJob(job),
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
      console.log(`Batch email job ${job.id} completed: ${result?.succeeded}/${result?.total} sent`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Batch email job ${job?.id} failed:`, err.message);
    });

    console.log('Batch access-email worker started');
    return worker;
  } catch (err) {
    console.error('Failed to start batch email worker:', err.message);
    return null;
  }
}

module.exports = { addBatchEmailJob, getBatchEmailJobStatus, startBatchEmailWorker };
