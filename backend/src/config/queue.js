'use strict';

/**
 * BullMQ queue configuration for Validstep.
 *
 * Queues:
 *  - payment-verification  : async PayU server-side verify + mark PAID
 *  - certificate-generation: PDF generation (existing)
 *
 * All queues share the same Redis connection.
 */

const { Queue } = require('bullmq');
const { getRedisClient, isRedisAvailable } = require('./redis');

let paymentQueue = null;

/**
 * Get (or lazily create) the payment-verification queue.
 * Returns null if Redis is not available — callers must handle gracefully.
 */
function getPaymentQueue() {
  if (!isRedisAvailable()) return null;

  if (!paymentQueue) {
    paymentQueue = new Queue('payment-verification', {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 7,            // 7 retries: 3s, 6s, 12s, 24s, 48s, 96s, 192s (~5.5min total)
        backoff: {
          type: 'exponential',
          delay: 3_000,
        },
        removeOnComplete: { count: 1000 }, // audit trail for last 1000 settled payments
        removeOnFail: { count: 500 },      // keep failed jobs for manual reconciliation
      },
    });

    paymentQueue.on('error', (err) => {
      console.error('[Queue] payment-verification error:', err.message);
    });
  }

  return paymentQueue;
}

/**
 * Enqueue a PayU verification job.
 *
 * Uses jobId = `payu:${txnid}` for automatic deduplication:
 * - Success redirect and webhook for the same txn both try to enqueue
 * - BullMQ silently drops the duplicate (same jobId, active/waiting)
 *
 * @param {{ txnid, orderId, redirectBody?, webhookBody?, source }} data
 */
async function enqueuePaymentVerification(data) {
  const queue = getPaymentQueue();
  if (!queue) {
    // Redis unavailable — caller will fall back to synchronous verify
    return null;
  }

  const { txnid, source } = data;
  const jobId = `payu:${txnid}`;

  // Redirect jobs (user is waiting on the page) get higher priority than webhooks.
  // Add a 3s delay to redirect jobs — PayU's verify API sometimes returns 'not_found'
  // if queried immediately after redirect (race condition with PayU's own processing).
  const priority = source === 'redirect' ? 1 : 2;
  const delay = source === 'redirect' ? 3_000 : 0;

  // BullMQ deduplication: same jobId is a no-op if already waiting/active
  const job = await queue.add('verify-and-settle', data, { jobId, priority, delay });
  return job;
}

async function closePaymentQueue() {
  if (paymentQueue) {
    await paymentQueue.close();
    paymentQueue = null;
  }
}

module.exports = {
  getPaymentQueue,
  enqueuePaymentVerification,
  closePaymentQueue,
};
