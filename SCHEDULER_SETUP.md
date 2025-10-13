# Props Ingestion Scheduler Setup

## Overview

The props ingestion scheduler automatically fetches and updates player props from SportsGameOdds API across all major sports (NFL, NBA, MLB, NHL).

## Schedule

1. **Daily Baseline** (3 AM UTC): Full slate ingestion for all leagues
2. **Regular Refresh** (Every 15 minutes): Keeps props updated throughout the day
3. **NFL Sunday Surge** (Every 5 minutes, 5-11 PM UTC): Rapid updates before NFL games
4. **NBA Weeknight Surge** (Every 5 minutes, 11 PM - 4 AM UTC): Rapid updates before NBA games
5. **Live Props** (Every minute, optional): Enable with `ENABLE_LIVE_PROPS=true`

## Quick Start

### Option 1: Run Locally

```bash
# Set environment variables
export DATABASE_URL='postgresql://...'
export SPORTSGAMEODDS_API_KEY='your-key'

# Start scheduler (runs continuously)
npm run schedule:props
```

### Option 2: PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start scheduler with PM2
pm2 start ecosystem.config.cjs

# View logs
pm2 logs props-scheduler

# Stop scheduler
pm2 stop props-scheduler

# Restart scheduler
pm2 restart props-scheduler

# Enable startup on boot
pm2 startup
pm2 save
```

### Option 3: Systemd Service (Linux)

```bash
# Copy service file
sudo cp statpedia-props-scheduler.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable statpedia-props-scheduler

# Start service
sudo systemctl start statpedia-props-scheduler

# Check status
sudo systemctl status statpedia-props-scheduler

# View logs
sudo journalctl -u statpedia-props-scheduler -f
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `SPORTSGAMEODDS_API_KEY` | Yes | SportsGameOdds API key |
| `ENABLE_LIVE_PROPS` | No | Set to `'true'` to enable minute-by-minute updates (default: `false`) |

## Manual Ingestion

Run ingestion manually anytime:

```bash
# All leagues
npm run ingest:props:drizzle ALL

# Single league
npm run ingest:props:drizzle NFL
npm run ingest:props:drizzle NBA
npm run ingest:props:drizzle MLB
npm run ingest:props:drizzle NHL
```

## Validation

Check ingestion results:

```bash
DATABASE_URL='postgresql://...' node scripts/validate-props.mjs
```

Or run SQL directly:

```sql
-- Props count by league
SELECT l.code, COUNT(*) 
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code;

-- Sample props
SELECT p.prop_type, p.line, p.odds, pl.name, t.abbreviation
FROM props p
JOIN players pl ON p.player_id = pl.id
JOIN teams t ON p.team_id = t.id
ORDER BY p.created_at DESC
LIMIT 20;
```

## Monitoring

### Check Scheduler Health

```bash
# PM2
pm2 status props-scheduler
pm2 monit

# Systemd
sudo systemctl status statpedia-props-scheduler
```

### View Logs

```bash
# PM2
pm2 logs props-scheduler --lines 100

# Systemd
sudo journalctl -u statpedia-props-scheduler -n 100 -f

# Local
tail -f logs/props-scheduler-*.log
```

## Troubleshooting

### Scheduler Not Running

1. Check environment variables are set
2. Verify DATABASE_URL is accessible
3. Confirm API key is valid
4. Check logs for errors

### Props Not Updating

1. Verify scheduler is running: `pm2 status` or `systemctl status`
2. Check logs for API errors
3. Run manual ingestion to test: `npm run ingest:props:drizzle NFL`
4. Validate database connection

### High Memory Usage

1. Reduce frequency of live props updates
2. Increase `max_memory_restart` in PM2 config
3. Monitor with: `pm2 monit`

## Performance Tips

1. **Disable Live Props** unless actively needed (saves API calls and resources)
2. **Use PM2 clustering** for high-availability setups
3. **Monitor API rate limits** from SportsGameOdds
4. **Set up alerts** for failed ingestions using PM2 Plus or similar

## Architecture

```
┌─────────────────────────────────────────────┐
│         Node.js Cron Scheduler              │
├─────────────────────────────────────────────┤
│  • Daily Baseline (3 AM UTC)                │
│  • 15-Min Refresh                           │
│  • NFL Sunday Surge                         │
│  • NBA Weeknight Surge                      │
│  • Live Props (optional)                    │
└────────────┬────────────────────────────────┘
             │
             ▼
   ┌─────────────────────┐
   │  Drizzle ORM        │
   │  + TypeScript       │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐       ┌──────────────────┐
   │   Neon Database     │◄──────│  SportsGameOdds  │
   │   (PostgreSQL)      │       │  v2 API          │
   └─────────────────────┘       └──────────────────┘
             │
             ▼
   ┌─────────────────────┐
   │   Hasura GraphQL    │
   │   (Frontend API)    │
   └─────────────────────┘
```

## Cost Considerations

- **API Calls**: ~96 calls/day (baseline) + ~576 calls/day (15-min refresh) + surge jobs
- **Database**: Neon free tier supports ~5-10K props easily
- **Compute**: Minimal (~10-50 MB RAM per run)

Enable live props only if needed to stay within API rate limits.

