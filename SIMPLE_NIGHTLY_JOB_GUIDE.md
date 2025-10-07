# Simple Nightly Job Guide

A streamlined version of the nightly data pipeline that combines all three steps into a single, easy-to-understand script.

## 🎯 Overview

The Simple Nightly Job performs three essential tasks:

1. **Ingest PlayerGameLogs** - Fetches the last 24 hours of player performance data
2. **Ingest PropLines** - Fetches the last 24 hours of sportsbook prop lines  
3. **Precompute Analytics** - Joins the data and calculates betting analytics

## 🚀 Usage

### Run the Simple Nightly Job

```bash
npm run nightly-job:simple
```

### Available Scripts

```bash
# Simple nightly job (all three steps)
npm run nightly-job:simple

# Full combined nightly job (with enhanced features)
npm run nightly-job

# Individual components
npm run nightly-job:ingestion-only
npm run nightly-job:proplines-only  
npm run nightly-job:analytics-only
```

## 📊 What It Does

### Step 1: PlayerGameLogs Ingestion
- Fetches events from the last 24 hours for all leagues (NFL, NBA, MLB, NHL)
- Processes player statistics from each event
- Normalizes team names and market types
- Upserts into `playergamelogs` table

### Step 2: PropLines Ingestion  
- Fetches prop lines from the last 24 hours for all leagues
- Processes over/under odds from sportsbooks
- Normalizes market types and team names
- Upserts into `proplines` table

### Step 3: Analytics Precomputation
- Finds unique player/prop combinations from game logs
- Joins game logs with prop lines on (player_id, date, prop_type)
- Calculates hit rates for L5, L10, L20, and season
- Calculates current and longest streaks
- Computes for both 'over' and 'under' directions
- Upserts into `playeranalytics` table

## 🔧 Key Features

### Error Handling
- API request validation
- Graceful error recovery
- Detailed logging for debugging
- Request rate limiting (100ms delays)

### Data Normalization
- Team name standardization across leagues
- Market type normalization (e.g., "pass yard" → "Passing Yards")
- Player ID generation for missing IDs
- Odds parsing and validation

### Performance Optimizations
- Batch processing with pagination
- Progress tracking for large datasets
- Efficient database upserts with conflict resolution
- Memory-conscious data processing

## 📈 Output Example

```
🚀 Starting simple nightly job...
⏰ Started at: 2025-01-03T10:30:00.000Z
============================================================

📥 STEP 1: Ingest PlayerGameLogs
----------------------------------------
📊 Processing NFL game logs...
  ✅ Inserted 150 game log records
✅ NFL: 150 game log records
📊 Processing NBA game logs...
  ✅ Inserted 200 game log records
✅ NBA: 200 game log records

🎯 STEP 2: Ingest PropLines
----------------------------------------
🎯 Processing NFL prop lines...
  ✅ Inserted 75 prop line records
✅ NFL: 75 prop line records

📊 STEP 3: Precompute Analytics
----------------------------------------
✅ Found 500 player/prop combinations
  📊 Processed 500/500 combinations
💾 Upserting 1000 analytics records...
✅ Successfully upserted 1000 analytics records

🎉 SIMPLE NIGHTLY JOB COMPLETE
============================================================

📊 GAME LOGS RESULTS:
  NFL: 150 records
  NBA: 200 records
  Total: 350 records

🎯 PROP LINES RESULTS:
  NFL: 75 records
  Total: 75 records

📈 ANALYTICS RESULTS:
  Records processed: 1000

✅ Simple nightly job completed successfully!
```

## 🗂️ Data Flow

```
SportsGameOdds API
       ↓
┌─────────────────┐    ┌─────────────────┐
│ PlayerGameLogs  │    │ PropLines       │
│ (last 24h)      │    │ (last 24h)      │
└─────────────────┘    └─────────────────┘
       ↓                       ↓
       └───────────────────────┘
                   ↓
         ┌─────────────────────┐
         │ Enhanced Analytics  │
         │ (joined data)       │
         └─────────────────────┘
```

## 🔄 Scheduling

### Cron Job Setup

Create a cron job to run nightly at 2 AM:

```bash
# Edit crontab
crontab -e

# Add this line
0 2 * * * cd /path/to/statpedia-08 && npm run nightly-job:simple >> /var/log/simple-nightly.log 2>&1
```

### Manual Execution

For testing or manual runs:

```bash
# Run once
npm run nightly-job:simple

# Run with verbose output
npm run nightly-job:simple | tee nightly-output.log
```

## 🛠️ Configuration

### Environment Variables

Make sure these are set in your `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SPORTSGAMEODDS_API_KEY=your_api_key
```

### Customization

The script can be easily customized:

- **Leagues**: Modify the `LEAGUES` array to include/exclude leagues
- **Time Window**: Change the `since` calculation for different time periods
- **Batch Size**: Adjust the `limit=100` parameter for API requests
- **Rate Limiting**: Modify the delay between requests

## 🔍 Troubleshooting

### Common Issues

1. **API Rate Limits**: Increase delays between requests
2. **Memory Issues**: Process data in smaller batches
3. **Database Timeouts**: Increase timeout settings
4. **Missing Data**: Check API key permissions and league availability

### Debug Mode

For detailed debugging, you can modify the script to add more verbose logging:

```javascript
// Add this at the top of functions
console.log(`🔍 Debug: Processing ${league} with ${rows.length} records`);
```

## 📚 Related Files

- `scripts/simple-nightly-job.js` - Main script
- `scripts/analyticsCalculators.js` - Analytics calculation functions
- `supabase/migrations/` - Database schema files
- `package.json` - NPM scripts configuration

## 🎉 Benefits

- **Simple**: Single script, easy to understand and modify
- **Reliable**: Robust error handling and recovery
- **Fast**: Optimized for performance with minimal overhead
- **Maintainable**: Clean code structure with clear separation of concerns
- **Flexible**: Easy to customize for different requirements

This simple approach provides all the essential functionality while remaining easy to understand and maintain!
