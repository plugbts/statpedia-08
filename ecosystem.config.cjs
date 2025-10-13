/**
 * PM2 Ecosystem Configuration for Props Ingestion Scheduler
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs props-scheduler
 *   pm2 stop props-scheduler
 *   pm2 restart props-scheduler
 */

module.exports = {
  apps: [{
    name: 'props-scheduler',
    script: './scripts/schedule-props-ingestion.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      // Set these in your .env or pass via pm2 start --env production
      // DATABASE_URL: 'postgresql://...',
      // SPORTSGAMEODDS_API_KEY: 'your-key',
      // ENABLE_LIVE_PROPS: 'false'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/props-scheduler-error.log',
    out_file: './logs/props-scheduler-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};

