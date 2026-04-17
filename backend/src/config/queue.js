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
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 3_000, // 3s, 6s, 12s, 24s, 48s
        },
        removeOnComplete: { count: 500 },  // keep last 500 completed jobs for audit
        removeOnFail: { count: 200 },
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

  const { txnid } = data;
  const jobId = `payu:${txnid}`;

  // BullMQ deduplication: if a job with same jobId already exists
  // in waiting/active/delayed state, this is a no-op.
  const job = await queue.add('verify-and-settle', data, { jobId });
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
