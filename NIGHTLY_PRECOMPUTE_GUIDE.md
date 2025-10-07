# Nightly Analytics Precompute Guide

This guide explains how to set up and run the nightly analytics precompute job for PlayerAnalytics.

## Overview

The nightly precompute job processes PlayerGameLogs data and precomputes analytics metrics into the PlayerAnalytics table. This improves query performance and provides real-time analytics for the application.

## Features

- **Batch Processing**: Processes players in batches of 50 for optimal performance
- **Comprehensive Analytics**: Calculates hit rates, streaks, and chart data
- **Error Handling**: Robust error handling with detailed logging
- **Upsert Logic**: Efficiently updates existing records or creates new ones
- **Multiple Time Periods**: Calculates analytics for season, last 20, 10, and 5 games

## Analytics Calculated

### Hit Rates
- Season total hit rate
- Last 20 games hit rate  
- Last 10 games hit rate
- Last 5 games hit rate

### Streak Data
- Current streak length
- Longest streak length
- Streak direction (over_hit, under_hit, mixed)

### Additional Data
- Chart data (last 20 games)
- Defensive matchup rankings
- Metadata (computation timestamp, season, sport)

## Setup Instructions

### 1. Environment Variables

Ensure these environment variables are set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Functions

The job relies on these database functions (already created):
- `calculate_hit_rate(player_id, prop_type, line, direction, games_limit)`
- `calculate_streak(player_id, prop_type, line, direction)`
- `get_player_chart_data(player_id, prop_type, limit)`
- `get_defensive_rank(team, opponent, prop_type, position, season)`

### 3. Tables Required

- `playergamelogs`: Source data table
- `player_props`: Current lines and sport information
- `PlayerAnalytics`: Target analytics table

## Usage

### Manual Execution

```bash
# Run for current season (2025)
npm run precompute-analytics

# Run for specific season
npm run precompute-analytics:2024
npm run precompute-analytics:2025

# Direct script execution
node scripts/nightly-precompute-analytics.js 2025
```

### Automated Scheduling

#### Option 1: Cron Job (Linux/macOS)

Add to crontab to run daily at 2:00 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /path/to/statpedia-08/scripts/nightly-precompute-cron.sh
```

#### Option 2: Systemd Timer (Linux)

Create service file `/etc/systemd/system/nightly-analytics.service`:

```ini
[Unit]
Description=Nightly Analytics Precompute
After=network.target

[Service]
Type=oneshot
User=your_user
WorkingDirectory=/path/to/statpedia-08
ExecStart=/path/to/statpedia-08/scripts/nightly-precompute-cron.sh
Environment=NODE_ENV=production
Environment=SUPABASE_URL=your_supabase_url
Environment=SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create timer file `/etc/systemd/system/nightly-analytics.timer`:

```ini
[Unit]
Description=Run Nightly Analytics Precompute at 2 AM
Requires=nightly-analytics.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable nightly-analytics.timer
sudo systemctl start nightly-analytics.timer
```

#### Option 3: GitHub Actions (CI/CD)

Create `.github/workflows/nightly-analytics.yml`:

```yaml
name: Nightly Analytics Precompute

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2:00 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  precompute:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run analytics precompute
        run: npm run precompute-analytics
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Monitoring and Logs

### Log Files

Logs are written to:
- Console output with timestamps
- `logs/nightly-precompute-YYYY-MM-DD.log` files

### Key Metrics to Monitor

- Processing time per batch
- Number of player-prop combinations processed
- Success/failure rates for upserts
- Database connection stability

### Performance Optimization

- **Batch Size**: Adjust batch size (default 50) based on system resources
- **Database Indexes**: Ensure proper indexes on PlayerGameLogs table
- **Connection Pooling**: Configure Supabase connection pooling
- **Memory Usage**: Monitor memory usage for large datasets

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY
   - Check network connectivity
   - Verify database functions exist

2. **Memory Issues**
   - Reduce batch size
   - Process fewer players at once
   - Monitor system resources

3. **Performance Issues**
   - Check database indexes
   - Optimize query performance
   - Consider running during off-peak hours

### Debug Mode

Run with verbose logging:

```bash
DEBUG=true node scripts/nightly-precompute-analytics.js 2025
```

### Manual Testing

Test individual components:

```bash
# Test database connection
npm run debug-analytics

# Test specific player
node -e "
import { precomputeAnalytics } from './scripts/nightly-precompute-analytics.js';
precomputeAnalytics(2025);
"
```

## Data Flow

```
PlayerGameLogs → Database Functions → Analytics Calculation → PlayerAnalytics Table
     ↓                    ↓                    ↓                      ↓
  Raw game data    calculate_hit_rate    Processed metrics    Precomputed results
                  calculate_streak       Batch processing     Upsert operations
                  get_player_chart_data  Error handling       Performance cache
```

## Security Considerations

- Use environment variables for sensitive data
- Implement proper RLS policies on PlayerAnalytics table
- Monitor for unusual processing patterns
- Regular backup of analytics data
- Rate limiting for database operations

## Future Enhancements

- **Incremental Updates**: Only process changed data
- **Real-time Processing**: Process data as it arrives
- **Advanced Analytics**: Machine learning predictions
- **Multi-sport Support**: Extend to other sports
- **Performance Metrics**: Detailed performance monitoring
