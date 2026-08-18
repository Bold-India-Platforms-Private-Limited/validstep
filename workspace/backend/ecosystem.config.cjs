module.exports = {
  apps: [
    {
      name: "workspace-backend",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "800M",
      restart_delay: 3000,
      env_production: { NODE_ENV: "production" },
    },
  ],
};
