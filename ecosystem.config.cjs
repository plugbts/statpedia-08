/**
 * PM2 Ecosystem Configuration for Props Ingestion Scheduler
 *
 * Notes:
 * - Loads environment variables from a local .env file (if present)
 * - Writes stdout/stderr to ./logs and timestamps each line
 * - Designed for a single persistent scheduler process (no clustering)
 *
 * Quick usage:
 *   pm2 start ecosystem.config.cjs --only props-scheduler
 *   pm2 logs props-scheduler
 *   pm2 restart props-scheduler
 *   pm2 save
 */

// Load .env into process.env if present
try {
  require('dotenv').config();
} catch {}

// Ensure the logs directory exists so PM2 can write out_file/error_file
try {
  const fs = require('fs');
  if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs', { recursive: true });
  }
} catch {}

module.exports = {
  apps: [
    {
      name: 'props-scheduler',
      script: './scripts/schedule-props-ingestion.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Helpful graceful shutdown/restart behavior
      kill_timeout: 10000,
      exp_backoff_restart_delay: 5000,
      node_args: ['--max-old-space-size=1024'],
      // Environment passed to the process (sourced from .env if available)
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        DATABASE_URL: process.env.DATABASE_URL || '',
        NEON_DATABASE_URL: process.env.NEON_DATABASE_URL || '',
        SPORTSGAMEODDS_API_KEY: process.env.SPORTSGAMEODDS_API_KEY || process.env.SPORTS_API_KEY || '',
        ENABLE_LIVE_PROPS: process.env.ENABLE_LIVE_PROPS || 'false'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Logging
      error_file: './logs/props-scheduler-error.log',
      out_file: './logs/props-scheduler-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Uptime/Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};

