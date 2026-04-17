'use strict';

/**
 * Payment Verification Worker
 * ───────────────────────────
 * Processes `payment-verification` queue jobs.
 *
 * Each job represents one PayU transaction that needs to be:
 *   1. Server-side verified via PayU's verify_payment API
 *   2. Settled (order marked PAID / FAILED, certificate created)
 *
 * BullMQ handles:
 *   - Retries with exponential backoff (PayU API transient failures)
 *   - Deduplication via jobId = `payu:{txnid}`
 *   - Concurrency control (WORKER_CONCURRENCY env var)
 *   - Graceful shutdown (worker.close())
 */

const { Worker } = require('bullmq');
const { getRedisClient, isRedisAvailable } = require('../config/redis');

// Import the core settling functions directly to avoid circular deps
const { db } = require('../config/database');
const { verifyPaymentWithPayU, verifyPayUHash, verifyWebhookHash } = require('../utils/payu');
const { generateVerificationHash } = require('../utils/hash');
const { sendPaymentConfirmationEmail } = require('../utils/email');

const CONCURRENCY = parseInt(process.env.PAYMENT_WORKER_CONCURRENCY || '10', 10);

/* ─────────────────────────────────────────────
   Core settling logic (self-contained in worker)
───────────────────────────────────────────── */

async function markOrderPaidWorker(orderId, txnid, mihpayid, gatewayResponse, isWebhook) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      batch: { include: { company: { select: { id: true, name: true } } } },
    },
  });

  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status === 'PAID') {
    console.log(`[Worker] Order ${orderId} already PAID — idempotent skip`);
    return { status: 'already_paid', orderId };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { order_id: orderId },
      data: {
        status: 'SUCCESS',
        payu_txn_id: txnid,
        payu_payment_id: mihpayid || null,
        gateway_response: gatewayResponse || {},
        ...(isWebhook ? { webhook_payload: gatewayResponse } : {}),
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID', payu_txn_id: txnid },
    });

    const existing = await tx.certificate.findUnique({ where: { order_id: orderId } });
    if (!existing) {
      const verificationHash = generateVerificationHash(
        order.certificate_serial,
        order.user_id,
        order.batch_id
      );
      const template = await tx.certificateTemplate.findFirst({
        where: { batch_id: order.batch_id, is_active: true },
        orderBy: { created_at: 'desc' },
      });
      await tx.certificate.create({
        data: {
          order_id: orderId,
          user_id: order.user_id,
          batch_id: order.batch_id,
          company_id: order.company_id,
          certificate_serial: order.certificate_serial,
          template_id: template?.id || null,
          is_issued: false,
          verification_hash: verificationHash,
        },
      });
    }
  });

  // Fire-and-forget email (do NOT await — email latency must not block the worker)
  sendPaymentConfirmationEmail({
    userName: order.user.name,
    userEmail: order.user.email,
    batchName: order.batch.name,
    companyName: order.batch.company.name,
    amount: order.amount,
    currency: order.currency,
    certificateSerial: order.certificate_serial,
    txnId: txnid,
    paidAt: new Date(),
    orderId: order.id,
  }).catch((e) => console.error('[Worker] Email failed (non-fatal):', e.message));

  return { status: 'paid', orderId };
}

async function markOrderFailedWorker(orderId, txnid, mihpayid, gatewayResponse, isWebhook) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status === 'PAID') {
    console.warn(`[Worker] Failure received for PAID order ${orderId} — ignoring`);
    return { status: 'already_paid', orderId };
  }

  await db.payment.updateMany({
    where: { order_id: orderId },
    data: {
      status: 'FAILURE',
      payu_txn_id: txnid || order.payu_txn_id,
      payu_payment_id: mihpayid || null,
      gateway_response: gatewayResponse || {},
      ...(isWebhook ? { webhook_payload: gatewayResponse } : {}),
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: 'FAILED' },
  });

  return { status: 'failed', orderId };
}

/* ─────────────────────────────────────────────
   Job processor
───────────────────────────────────────────── */

async function processVerificationJob(job) {
  const { txnid, orderId, source, redirectBody, webhookBody } = job.data;

  job.log(`Processing PayU verify for txn=${txnid} order=${orderId} source=${source} attempt=${job.attemptsMade + 1}`);

  // 1. Call PayU verify API — this is the safe point to do the outbound HTTP call
  let payuResult;
  try {
    payuResult = await verifyPaymentWithPayU(txnid);
  } catch (verifyErr) {
    // Network error — rethrow so BullMQ retries with exponential backoff
    throw new Error(`PayU API unreachable: ${verifyErr.message}`);
  }

  await job.updateProgress(50);

  const rawPayload = webhookBody || redirectBody || {};

  if (payuResult.verified) {
    const result = await markOrderPaidWorker(
      orderId,
      txnid,
      payuResult.mihpayid,
      { ...rawPayload, payu_verify: payuResult.txnDetails },
      source === 'webhook'
    );
    job.log(`Settled PAID: ${result.status}`);
    return result;
  }

  if (payuResult.status === 'pending') {
    // Still pending at PayU — throw a retriable error so BullMQ retries
    // This will retry up to 5 times with exponential backoff
    throw Object.assign(
      new Error(`PayU transaction ${txnid} still pending`),
      { code: 'PAYU_PENDING' }
    );
  }

  // Failure confirmed
  const result = await markOrderFailedWorker(
    orderId,
    txnid,
    payuResult.mihpayid,
    { ...rawPayload, payu_verify: payuResult.txnDetails },
    source === 'webhook'
  );
  job.log(`Settled FAILED: ${result.status}`);
  return result;
}

/* ─────────────────────────────────────────────
   Worker lifecycle
───────────────────────────────────────────── */

let worker = null;

function startPaymentVerificationWorker() {
  if (!isRedisAvailable()) {
    console.warn('[Worker] Redis unavailable — payment-verification worker not started');
    return null;
  }

  if (worker) return worker; // Already started

  worker = new Worker('payment-verification', processVerificationJob, {
    connection: getRedisClient(),
    concurrency: CONCURRENCY,
    // Stalled job detection: if a job doesn't heartbeat in 60s, mark stalled
    stalledInterval: 60_000,
    maxStalledCount: 2,
  });

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed: ${JSON.stringify(result)}`);
  });

  worker.on('failed', (job, err) => {
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 5);
    if (isFinalAttempt) {
      console.error(`[Worker] Job ${job.id} permanently failed after ${job.attemptsMade} attempts: ${err.message}`);
      // TODO: alert engineering team — payment may need manual reconciliation
    } else {
      console.warn(`[Worker] Job ${job.id} attempt ${job.attemptsMade} failed (will retry): ${err.message}`);
    }
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled — will be retried`);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
  });

  console.log(`[Worker] payment-verification worker started (concurrency=${CONCURRENCY})`);
  return worker;
}

async function stopPaymentVerificationWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker] payment-verification worker stopped');
  }
}

module.exports = { startPaymentVerificationWorker, stopPaymentVerificationWorker };
