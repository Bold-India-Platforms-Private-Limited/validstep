'use strict';

/**
 * Standalone Worker Process
 * ──────────────────────────
 * Run by PM2 as a dedicated process separate from the HTTP API.
 * Handles BullMQ jobs: payment verification + certificate generation.
 *
 * This way HTTP instances (cluster) never run heavy async work,
 * and workers can scale independently.
 */

require('./src/config/env');

const { initRedis, disconnectRedis } = require('./src/config/redis');
const { disconnectDB } = require('./src/config/database');
const { startPaymentVerificationWorker, stopPaymentVerificationWorker } = require('./src/workers/paymentVerificationWorker');
const { closePaymentQueue } = require('./src/config/queue');

async function startWorker() {
  console.log('[Worker Process] Starting...');

  await initRedis();

  // Payment verification worker
  startPaymentVerificationWorker();

  // Certificate generation worker (already exists in certificate.service)
  try {
    const { startCertificateWorker } = require('./src/modules/certificate/certificate.service');
    startCertificateWorker();
  } catch (err) {
    console.warn('[Worker Process] Certificate worker not started:', err.message);
  }

  console.log('[Worker Process] All workers running');
}

async function shutdown(signal) {
  console.log(`[Worker Process] ${signal} received — draining jobs...`);
  try {
    await stopPaymentVerificationWorker();
    await closePaymentQueue();
    await disconnectDB();
    await disconnectRedis();
    console.log('[Worker Process] Shutdown complete');
  } catch (err) {
    console.error('[Worker Process] Shutdown error:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Worker Process] Uncaught:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker Process] Unhandled rejection:', reason?.message || reason);
});

startWorker().catch((err) => {
  console.error('[Worker Process] Failed to start:', err.message);
  process.exit(1);
});
