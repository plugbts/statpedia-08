# PM2 Deployment for Props Scheduler

This doc shows how to run the scheduler under PM2 with environment variables, log rotation, and persistence across restarts.

## Prerequisites
- Node.js 18+
- PM2 installed globally
- A populated `.env` at the repo root with:
  - `DATABASE_URL` (or `NEON_DATABASE_URL`)
  - `SPORTSGAMEODDS_API_KEY`
  - optional: `ENABLE_LIVE_PROPS=false`

## One-time setup
1. Install PM2 (if needed):
   npm install -g pm2

2. Install PM2 log rotation module (optional but recommended):
   pm2 install pm2-logrotate

3. Configure log rotation (example):
   pm2 set pm2-logrotate:max_size 20M
   pm2 set pm2-logrotate:retain 10
   pm2 set pm2-logrotate:compress true
   pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
   pm2 set pm2-logrotate:workerInterval 300
   pm2 set pm2-logrotate:rotateInterval 0 0 * * *

## Start the scheduler
From the repository root:

1. Ensure `.env` exists and has required keys.
2. Start with the ecosystem file:
   pm2 start ecosystem.config.cjs --only props-scheduler
3. Check logs:
   pm2 logs props-scheduler
4. Persist across reboots:
   pm2 save

## Useful commands
- Restart after changes: pm2 restart props-scheduler
- Stop: pm2 stop props-scheduler
- Status: pm2 status
- Tail logs: pm2 logs props-scheduler --lines 200

## Notes
- The ecosystem config auto-loads `.env` and ensures a `logs/` folder exists.
- The scheduler script already prints a clear schedule summary on boot.
- If you prefer environment-managed secrets, you can remove the dotenv load and set env in your process manager or shell.
