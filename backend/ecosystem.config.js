'use strict';

/**
 * PM2 Cluster Configuration for Validstep Backend
 * ─────────────────────────────────────────────────
 * Production command: pm2 start ecosystem.config.js --env production
 * Development:        pm2 start ecosystem.config.js --env development
 *
 * At 10k tx/5min on a 4-core server:
 *   - 4 HTTP worker processes handle incoming requests
 *   - 1 dedicated worker process runs the BullMQ payment + cert workers
 *   - Each HTTP process: 5 Prisma connections × 4 = 20 DB connections total
 */

module.exports = {
  apps: [
    /* ── HTTP API Server (clustered across all CPU cores) ── */
    {
      name: 'validstep-api',
      script: 'server.js',
      instances: 'max',       // = number of CPU cores (e.g., 4 on a 4-core VPS)
      exec_mode: 'cluster',   // Node.js cluster — shared port, OS load-balances
      watch: false,
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        // Each cluster instance gets its own DB pool slice
        // Neon free: set connection_limit=2, paid: 5
        PAYMENT_WORKER_CONCURRENCY: '0', // HTTP workers: don't run payment worker
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        PAYMENT_WORKER_CONCURRENCY: '0', // dedicated worker process handles this
      },

      // PM2 merge logs from all instances
      combine_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',

      // Graceful restart
      kill_timeout: 10_000,   // 10s for in-flight requests to drain
      listen_timeout: 5_000,
      shutdown_with_message: true,
    },

    /* ── Payment + Certificate Worker (single process) ── */
    {
      name: 'validstep-worker',
      script: 'worker.js',    // see worker.js entry point below
      instances: 1,
      exec_mode: 'fork',      // single process — BullMQ manages its own concurrency
      watch: false,
      max_memory_restart: '256M',

      env: {
        NODE_ENV: 'development',
        PAYMENT_WORKER_CONCURRENCY: '10',
      },

      env_production: {
        NODE_ENV: 'production',
        PAYMENT_WORKER_CONCURRENCY: '20', // 20 concurrent PayU API calls
      },

      combine_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',

      kill_timeout: 30_000,   // workers need more time to finish in-flight jobs
    },
  ],
};
