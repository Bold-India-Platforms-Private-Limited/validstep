'use strict';

// Load env config first
require('./src/config/env');

const app = require('./src/app');
const env = require('./src/config/env');
const { disconnectDB } = require('./src/config/database');
const { initRedis, disconnectRedis } = require('./src/config/redis');

const PORT = env.PORT || 5001;

let server;

async function start() {
  try {
    // Try to connect Redis — non-fatal if unavailable
    await initRedis();

    // Start BullMQ certificate worker (only if Redis is available)
    try {
      const { startCertificateWorker } = require('./src/modules/certificate/certificate.service');
      startCertificateWorker();
    } catch (err) {
      console.warn('[Worker] Certificate worker not started:', err.message);
    }

    // Start BullMQ payment verification worker
    try {
      const { startPaymentVerificationWorker } = require('./src/workers/paymentVerificationWorker');
      startPaymentVerificationWorker();
    } catch (err) {
      console.warn('[Worker] Payment verification worker not started:', err.message);
    }

    server = app.listen(PORT, () => {
      // Keep-alive must exceed nginx's keepalive_timeout (default 75s).
      // 65s ensures nginx closes first, preventing 502s on idle connections.
      server.keepAliveTimeout = 65_000;
      server.headersTimeout = 66_000;

      console.log(`
┌─────────────────────────────────────────────────┐
│         Certificate SaaS Backend Server          │
│                                                  │
│  Environment : ${env.NODE_ENV.padEnd(32)}│
│  Port        : ${String(PORT).padEnd(32)}│
│  Base URL    : ${env.BACKEND_URL.padEnd(32)}│
└─────────────────────────────────────────────────┘
      `);
    });

    server.on('error', (err) => {
      console.error('Server error:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');
      try {
        // Stop workers before DB/Redis disconnect (let in-flight jobs finish)
        const { stopPaymentVerificationWorker } = require('./src/workers/paymentVerificationWorker');
        await stopPaymentVerificationWorker();
        console.log('Payment worker stopped');

        const { closePaymentQueue } = require('./src/config/queue');
        await closePaymentQueue();

        await disconnectDB();
        console.log('Database disconnected');
        await disconnectRedis();
        console.log('Redis disconnected');
      } catch (err) {
        console.error('Error during shutdown:', err.message);
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Don't exit for Redis/network errors
  if (err.code === 'ECONNREFUSED' || err.message?.includes('Redis')) {
    console.warn('Ignoring Redis connection error');
    return;
  }
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason);
  // Ignore Redis connection failures — they're handled in redis.js
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('MaxRetriesPerRequest') ||
    msg.includes('Redis') ||
    msg.includes('redis')
  ) {
    return;
  }
  console.error('Unhandled Rejection:', msg);
  shutdown('unhandledRejection');
});

start();
