'use strict';

/**
 * PM2 Cluster Configuration — Validstep Backend
 * ───────────────────────────────────────────────
 * Production: pm2 start ecosystem.config.js --env production --update-env
 *
 * Architecture (2-core server targeting 50k users):
 *   2 × HTTP workers  — handle all incoming requests (shared port, OS load-balances)
 *   1 × BullMQ worker — async payment verification + certificate generation
 *
 * DB connections: 2 workers × 5 = 10 (Neon paid tier handles this fine)
 */

module.exports = {
  apps: [
    /* ── HTTP API Server ── */
    {
      name: 'validstep',
      script: 'server.js',
      instances: 2,             // match CPU core count — avoid over-subscribing
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '400M',

      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        PAYMENT_WORKER_CONCURRENCY: '0',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        PAYMENT_WORKER_CONCURRENCY: '0',
        UV_THREADPOOL_SIZE: '16',
      },

      // Cap V8 heap at 150MB per worker.
      // Without a limit, V8 may grow to 500MB+ before GC kicks in.
      // 150MB is enough for the request workload and lets GC run more aggressively.
      node_args: '--max-old-space-size=150',

      combine_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/logs/validstep-error.log',
      out_file: '/home/ec2-user/logs/validstep-out.log',

      kill_timeout: 15_000,    // 15s to drain in-flight requests before SIGKILL
      listen_timeout: 8_000,
      shutdown_with_message: true,

      // Exponential restart delay — prevents CPU burn on repeated crash loops
      exp_backoff_restart_delay: 100,
    },

    /* ── Payment + Certificate Worker ── */
    {
      name: 'validstep-worker',
      script: 'worker.js',
      instances: 1,
      exec_mode: 'fork',        // single process — BullMQ manages concurrency internally
      watch: false,
      max_memory_restart: '300M',

      env: {
        NODE_ENV: 'development',
        PAYMENT_WORKER_CONCURRENCY: '10',
      },

      env_production: {
        NODE_ENV: 'production',
        PAYMENT_WORKER_CONCURRENCY: '50',
        UV_THREADPOOL_SIZE: '16',
      },

      // Worker is memory-lighter than HTTP — 100MB cap is sufficient
      node_args: '--max-old-space-size=100',

      combine_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ec2-user/logs/validstep-worker-error.log',
      out_file: '/home/ec2-user/logs/validstep-worker-out.log',

      kill_timeout: 60_000,    // 60s — let in-flight PayU API calls complete before kill
      exp_backoff_restart_delay: 100,
    },
  ],
};
