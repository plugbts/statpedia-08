# Combined Nightly Job Guide

This guide explains how to set up and run the combined nightly job that handles both incremental data ingestion and analytics precomputation.

## Overview

The combined nightly job is a comprehensive data pipeline that:

1. **Incremental Ingestion**: Fetches the last 24 hours of sports events from the SportsGameOdds API
2. **Analytics Precomputation**: Processes PlayerGameLogs data and precomputes analytics into PlayerAnalytics table

This provides a complete nightly data refresh for your sports analytics platform.

## Features

### 🔄 Incremental Ingestion
- Fetches only the last 24 hours of events (efficient and fast)
- Supports multiple leagues: NFL, NBA, MLB, NHL
- Normalizes team names and market types
- Handles duplicate prevention with upsert operations
- Robust error handling per league

### 📊 Analytics Precomputation
- Processes all player-prop combinations from PlayerGameLogs
- Calculates comprehensive analytics using database functions
- Batch processing for optimal performance
- Upserts precomputed results into PlayerAnalytics table

### 🛡️ Error Handling & Monitoring
- Comprehensive error handling with detailed logging
- Individual league processing (continues if one fails)
- Batch processing with error isolation
- Detailed execution summaries and timing

## Architecture

```
SportsGameOdds API → Incremental Ingestion → PlayerGameLogs → Analytics Precomputation → PlayerAnalytics
                        ↓                           ↓                    ↓
                   Last 24h Events            Raw Game Data        Precomputed Analytics
                   Multi-league Support       Normalized Data      Hit Rates, Streaks, Charts
                   Error Handling             Upsert Operations    Performance Optimized
```

## Setup Instructions

### 1. Environment Variables

Ensure these environment variables are set:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
# OR use VITE_ prefixed versions
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# SportsGameOdds API
SPORTSGAMEODDS_API_KEY=your_api_key
```

### 2. Database Requirements

The job relies on these database components:

#### Tables
- `playergamelogs`: Source data table for game logs
- `player_props`: Current lines and sport information
- `PlayerAnalytics`: Target analytics table

#### Database Functions
- `calculate_hit_rate(player_id, prop_type, line, direction, games_limit)`
- `calculate_streak(player_id, prop_type, line, direction)`
- `get_player_chart_data(player_id, prop_type, limit)`
- `get_defensive_rank(team, opponent, prop_type, position, season)`

### 3. Dependencies

Ensure these dependencies are installed:
```bash
npm install @supabase/supabase-js node-fetch dotenv
```

## Usage

### Manual Execution

```bash
# Run the complete combined nightly job
npm run nightly-job

# Run individual components
npm run nightly-job:ingestion-only    # Only incremental ingestion
npm run nightly-job:analytics-only    # Only analytics precomputation

# Run individual analytics for specific seasons
npm run precompute-analytics:2024
npm run precompute-analytics:2025
```

### Automated Scheduling

#### Option 1: Cron Job (Linux/macOS)

Add to crontab to run daily at 2:00 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /path/to/statpedia-08/scripts/combined-nightly-cron.sh
```

#### Option 2: Systemd Timer (Linux)

Create service file `/etc/systemd/system/combined-nightly.service`:

```ini
[Unit]
Description=Combined Nightly Job (Ingestion + Analytics)
After=network.target

[Service]
Type=oneshot
User=your_user
WorkingDirectory=/path/to/statpedia-08
ExecStart=/path/to/statpedia-08/scripts/combined-nightly-cron.sh
Environment=NODE_ENV=production
Environment=SUPABASE_URL=your_supabase_url
Environment=SUPABASE_ANON_KEY=your_supabase_anon_key
Environment=SPORTSGAMEODDS_API_KEY=your_api_key
```

Create timer file `/etc/systemd/system/combined-nightly.timer`:

```ini
[Unit]
Description=Run Combined Nightly Job at 2 AM
Requires=combined-nightly.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable combined-nightly.timer
sudo systemctl start combined-nightly.timer
```

#### Option 3: GitHub Actions (CI/CD)

Create `.github/workflows/combined-nightly.yml`:

```yaml
name: Combined Nightly Job

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2:00 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  combined-nightly:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run combined nightly job
        run: npm run nightly-job
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SPORTSGAMEODDS_API_KEY: ${{ secrets.SPORTSGAMEODDS_API_KEY }}
```

## Data Flow

### Step 1: Incremental Ingestion
```
SportsGameOdds API → Event Data → Player Stats → Normalized Data → PlayerGameLogs
     ↓                    ↓            ↓              ↓               ↓
  Last 24h Events    Multi-league   Raw Stats    Team Mapping    Upsert Operations
  API Requests       Processing     Extraction   Type Mapping    Duplicate Handling
```

### Step 2: Analytics Precomputation
```
PlayerGameLogs → Player-Prop Combinations → Database Functions → Analytics Calculation → PlayerAnalytics
       ↓                    ↓                        ↓                    ↓                    ↓
    Raw Game Data      Unique Keys            calculate_hit_rate    Processed Metrics    Precomputed Results
    Filtered Data      Batch Processing       calculate_streak      Hit Rates            Upsert Operations
    Season Filter      Performance Opt        get_chart_data       Streaks              Performance Cache
```

## Monitoring and Logs

### Log Files

Logs are written to:
- Console output with detailed timestamps and emojis
- `logs/combined-nightly-YYYY-MM-DD.log` files

### Key Metrics to Monitor

#### Ingestion Metrics
- Records processed per league
- API response times
- Error rates per league
- Data freshness (last event dates)

#### Analytics Metrics
- Player-prop combinations processed
- Batch processing times
- Database function execution times
- Upsert success rates

### Performance Optimization

- **Batch Size**: Analytics batch size (default 50) can be adjusted based on system resources
- **API Rate Limiting**: Built-in delays between league processing
- **Database Indexes**: Ensure proper indexes on PlayerGameLogs and PlayerAnalytics tables
- **Connection Pooling**: Configure Supabase connection pooling
- **Memory Usage**: Monitor memory usage for large datasets

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify SPORTSGAMEODDS_API_KEY is valid
   - Check API rate limits and quotas
   - Monitor network connectivity

2. **Database Connection Errors**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY
   - Check database function existence
   - Monitor database connection limits

3. **Memory Issues**
   - Reduce analytics batch size
   - Process fewer players at once
   - Monitor system resources during execution

4. **Performance Issues**
   - Check database indexes
   - Optimize query performance
   - Consider running during off-peak hours
   - Monitor API response times

### Debug Mode

Run with verbose logging:

```bash
DEBUG=true npm run nightly-job
```

### Manual Testing

Test individual components:

```bash
# Test ingestion only
npm run nightly-job:ingestion-only

# Test analytics only
npm run nightly-job:analytics-only

# Test specific functions
npm run debug-analytics
```

## Security Considerations

- Use environment variables for all sensitive data
- Implement proper RLS policies on all tables
- Monitor for unusual processing patterns
- Regular backup of analytics data
- Rate limiting for database operations
- API key rotation and monitoring

## Expected Performance

### Typical Execution Times
- **Ingestion**: 2-5 minutes (depending on league activity)
- **Analytics**: 10-30 minutes (depending on data volume)
- **Total**: 15-35 minutes for complete job

### Data Volume Expectations
- **Daily Ingestion**: 100-1000 records per league
- **Analytics Processing**: 1000-10000 player-prop combinations
- **Storage Growth**: ~1-10MB per day depending on activity

## Future Enhancements

- **Real-time Processing**: Process data as it arrives
- **Incremental Analytics**: Only process changed data
- **Advanced Analytics**: Machine learning predictions
- **Multi-sport Expansion**: Additional sports support
- **Performance Monitoring**: Detailed metrics dashboard
- **Alert System**: Proactive failure notifications

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor log files for errors
- Check database function performance
- Verify API key validity
- Review storage usage
- Update team mappings as needed

### Backup and Recovery
- Regular database backups
- Analytics data export capabilities
- Disaster recovery procedures
- Data validation checks

This combined nightly job provides a robust, scalable solution for keeping your sports analytics platform up-to-date with the latest data and precomputed insights.
