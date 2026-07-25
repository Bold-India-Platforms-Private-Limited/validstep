'use strict';

/**
 * PM2 Cluster Configuration — Validstep Backend
 * ───────────────────────────────────────────────
 * Production: pm2 start ecosystem.config.js --env production --update-env
 *
 * Single process: server.js runs the HTTP API and starts the BullMQ
 * certificate-generation worker in-process (see server.js).
 */

module.exports = {
  apps: [
    /* ── HTTP API Server ── */
    {
      name: 'validstep',
      script: 'server.js',
      instances: 1,             // single cluster instance
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '400M',

      env: {
        NODE_ENV: 'development',
        PORT: 5001,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
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
  ],
};
