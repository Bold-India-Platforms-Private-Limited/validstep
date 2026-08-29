'use strict';

const { db } = require('../../config/database');
const { isRedisAvailable } = require('../../config/redis');
const { sendEmail, buildLoginDetailsEmailContent } = require('../../utils/email');
const { hashPassword, generateRandomToken } = require('../../utils/hash');
const { logDeliveryEvent } = require('../../utils/deliveryLog');
const env = require('../../config/env');

// Separate BullMQ queue from batch-access-email — different job, own pacing/state.
let batchLoginDetailsQueue = null;

function getBatchLoginDetailsQueue() {
  if (!batchLoginDetailsQueue) {
    const { Queue } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);
    batchLoginDetailsQueue = new Queue('batch-login-details-email', {
      connection: { host: redisUrl.hostname, port: parseInt(redisUrl.port || '6379'), password: redisUrl.password || undefined },
      defaultJobOptions: { attempts: 1, removeOnComplete: 50, removeOnFail: 50 },
    });
  }
  return batchLoginDetailsQueue;
}

const CHUNK_SIZE = 5;

// Same human-plausible pacing as batchEmailJob.service.js — see that file for the rationale.
const MIN_PER_MINUTE = 40;
const MAX_PER_MINUTE = 100;
const COOLDOWN_EVERY = 80;
const COOLDOWN_MIN_SECONDS = 30;
const COOLDOWN_MAX_SECONDS = 160;

function chunk(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

/**
 * For every given order's user: generates a brand new system password, hashes and saves it,
 * then emails the plaintext password + login URL. Runs in chunks of 5, paced identically to
 * the batch access-email job so a large batch doesn't send as one suspicious burst.
 */
async function processBatchLoginDetailsJob(job) {
  const { orderIds } = job.data;

  const orders = await db.order.findMany({
    where: { id: { in: orderIds } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const total = orders.length;
  let processed = 0, succeeded = 0, failed = 0, sentSinceCooldown = 0;
  const errors = [];
  const chunks = chunk(orders, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const batchChunk = chunks[i];
    await Promise.allSettled(batchChunk.map(async (order) => {
      try {
        const newPassword = generateRandomToken(8);
        const password_hash = await hashPassword(newPassword);
        await db.user.update({ where: { id: order.user.id }, data: { password_hash } });

        const { subject, html, text } = buildLoginDetailsEmailContent({
          name: order.user.name,
          email: order.user.email,
          password: newPassword,
          loginUrl: `${env.FRONTEND_URL}/auth/user/login`,
        });
        await sendEmail({ to: order.user.email, subject, html, text });

        // Log every send — the Order Timeline distinguishes the first send (shown on the
        // payment-captured date) from later resends (shown on their actual send date) by
        // ordinal position among a user's SYSTEM_PASSWORD_SENT events.
        logDeliveryEvent(order.user.id, 'SYSTEM_PASSWORD_SENT');

        succeeded += 1; sentSinceCooldown += 1;
      } catch (err) {
        failed += 1; errors.push({ email: order.user.email, reason: err.message });
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
      const minDelayMs = (CHUNK_SIZE / MAX_PER_MINUTE) * 60000;
      const maxDelayMs = (CHUNK_SIZE / MIN_PER_MINUTE) * 60000;
      await sleep(randomInt(minDelayMs, maxDelayMs));
    }
  }

  return { total, succeeded, failed, errors };
}

async function addBatchLoginDetailsJob({ batchId, orderIds }) {
  if (!isRedisAvailable()) {
    const result = await processBatchLoginDetailsJob({ data: { batchId, orderIds }, updateProgress: async () => {} });
    return { jobId: null, sync: true, result };
  }
  const queue = getBatchLoginDetailsQueue();
  const job = await queue.add('batch-login-details-email', { batchId, orderIds }, { jobId: `batch-login-${require('crypto').randomUUID()}` });
  return { jobId: job.id, sync: false };
}

async function getBatchLoginDetailsJobStatus(jobId) {
  const queue = getBatchLoginDetailsQueue();
  const job = await queue.getJob(jobId);
  if (!job) throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  const state = await job.getState();
  return {
    state,
    progress: job.progress && Object.keys(job.progress).length ? job.progress : { total: 0, processed: 0, succeeded: 0, failed: 0, errors: [], pacing: null },
    result: job.returnvalue || null,
  };
}

function startBatchLoginDetailsWorker() {
  if (!isRedisAvailable()) {
    console.log('[Worker] Redis not available — batch login-details email worker skipped (sync fallback active)');
    return null;
  }
  try {
    const { Worker } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);
    const worker = new Worker('batch-login-details-email', async (job) => processBatchLoginDetailsJob(job), {
      connection: { host: redisUrl.hostname, port: parseInt(redisUrl.port || '6379'), password: redisUrl.password || undefined },
      concurrency: 1,
    });
    worker.on('completed', (job, result) => console.log(`Batch login-details job ${job.id} completed: ${result?.succeeded}/${result?.total} sent`));
    worker.on('failed', (job, err) => console.error(`Batch login-details job ${job?.id} failed:`, err.message));
    console.log('Batch login-details email worker started');
    return worker;
  } catch (err) {
    console.error('Failed to start batch login-details worker:', err.message);
    return null;
  }
}

module.exports = { addBatchLoginDetailsJob, getBatchLoginDetailsJobStatus, startBatchLoginDetailsWorker };
