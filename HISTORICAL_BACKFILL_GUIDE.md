# Historical Backfill Guide

Complete guide for running historical data backfill to populate your database with past seasons of player performance and betting data.

## 🎯 Overview

The Historical Backfill Job processes multiple seasons of data:

1. **Ingests PlayerGameLogs** for each season → `playergamelogs` table
2. **Ingests PropLines** for each season → `proplines` table  
3. **Precomputes Analytics** for each season → `playeranalytics` table

## 🚀 Usage

### Run Full Backfill

```bash
# Backfill all configured seasons (2022, 2023, 2024)
npm run backfill-historical

# Backfill specific seasons
npm run backfill-historical:2022
npm run backfill-historical:2023
npm run backfill-historical:2024
```

### Available Scripts

```bash
# Full historical backfill
npm run backfill-historical

# Individual seasons
npm run backfill-historical:2022
npm run backfill-historical:2023
npm run backfill-historical:2024

# Run directly
node scripts/historical-backfill.js
```

## ⚙️ Configuration

### Seasons to Backfill

Edit the `SEASONS` array in `scripts/historical-backfill.js`:

```javascript
// Configure seasons to backfill
const SEASONS = [2022, 2023, 2024]; // Adjust this list as needed
```

### Performance Settings

```javascript
const CONFIG = {
  BATCH_SIZE: 100,                    // API request batch size
  DELAY_BETWEEN_REQUESTS: 200,        // ms delay between API calls
  DELAY_BETWEEN_SEASONS: 5000,        // ms delay between seasons
  MAX_RETRIES: 3,                     // API retry attempts
  PROGRESS_INTERVAL: 100              // Log progress every N records
};
```

### Leagues

```javascript
const LEAGUES = ["nfl", "nba", "mlb", "nhl"]; // Modify as needed
```

## 📊 What It Does

### For Each Season:

#### Step 1: Game Logs Ingestion
- Fetches all events for the season from SportsGameOdds API
- Processes player statistics from each event
- Normalizes team names and market types
- Upserts into `playergamelogs` table with conflict resolution

#### Step 2: Prop Lines Ingestion
- Fetches all prop lines for the season
- Processes over/under odds from sportsbooks
- Normalizes market types and team names
- Upserts into `proplines` table with conflict resolution

#### Step 3: Analytics Precomputation
- Finds unique player/prop combinations from game logs
- Joins game logs with prop lines on (player_id, date, prop_type)
- Calculates hit rates for L5, L10, L20, and season
- Calculates current and longest streaks
- Computes for both 'over' and 'under' directions
- Upserts into `playeranalytics` table

## 🔧 Key Features

### Error Handling & Recovery
- **Retry Logic**: Automatic retry with exponential backoff for API failures
- **Rate Limiting**: Built-in delays to respect API rate limits
- **Graceful Degradation**: Continues processing even if individual requests fail
- **Error Logging**: Detailed error tracking and reporting

### Performance Optimizations
- **Batch Processing**: Processes data in configurable batches
- **Progress Tracking**: Real-time progress updates during long operations
- **Memory Management**: Efficient data processing to handle large datasets
- **Conflict Resolution**: Smart upsert logic to handle duplicate data

### Data Quality
- **Validation**: Input validation for all API responses
- **Normalization**: Consistent team names and market types across leagues
- **Deduplication**: Removes duplicate records automatically
- **Data Integrity**: Maintains referential integrity between tables

## 📈 Expected Output

```
🚀 Starting Historical Backfill Job
⏰ Started at: 2025-01-03T10:30:00.000Z
📅 Seasons to process: 2022, 2023, 2024
🏈 Leagues: NFL, NBA, MLB, NHL
================================================================================

🔄 BACKFILLING SEASON 2022 (1/3)
============================================================

📥 STEP 1: Ingest Season Game Logs
----------------------------------------
📊 Processing NFL 2022 game logs...
  📊 Processed 1,000 records...
  📊 Processed 2,000 records...
✅ NFL 2022: 5,250 game log records
📊 Processing NBA 2022 game logs...
✅ NBA 2022: 8,750 game log records

🎯 STEP 2: Ingest Season Prop Lines
----------------------------------------
🎯 Processing NFL 2022 prop lines...
✅ NFL 2022: 12,500 prop line records

📊 STEP 3: Precompute Season Analytics
----------------------------------------
✅ Found 1,250 player/prop combinations
  📊 Processed 1,250/1,250 combinations
💾 Upserting 2,500 analytics records...
✅ Successfully upserted 2,500 analytics records

✅ SEASON 2022 COMPLETE
============================================================
⏱️ Duration: 245.67s
📊 Game Logs: 14,000 records
🎯 Prop Lines: 12,500 records
📈 Analytics: 2,500 records

🎉 HISTORICAL BACKFILL COMPLETE
================================================================================
📅 Seasons processed: 3/3
📊 Total Game Logs: 42,000 records
🎯 Total Prop Lines: 37,500 records
📈 Total Analytics: 7,500 records

✅ Historical backfill completed successfully!
```

## ⏱️ Performance Expectations

### Runtime Estimates

| Season | Game Logs | Prop Lines | Analytics | Total Time |
|--------|-----------|------------|-----------|------------|
| 2022   | ~15,000   | ~12,000    | ~2,500    | ~4-6 min   |
| 2023   | ~18,000   | ~15,000    | ~3,000    | ~5-7 min   |
| 2024   | ~20,000   | ~18,000    | ~3,500    | ~6-8 min   |
| **Total** | **~53,000** | **~45,000** | **~9,000** | **~15-21 min** |

*Estimates based on typical data volumes and API response times*

### Resource Usage

- **Memory**: ~200-500MB peak usage
- **CPU**: Moderate usage during API calls
- **Network**: Heavy usage during data fetching
- **Storage**: Significant database growth

## 🛠️ Troubleshooting

### Common Issues

#### 1. API Rate Limits
**Symptoms**: 429 Too Many Requests errors  
**Solutions**:
```javascript
// Increase delays in CONFIG
DELAY_BETWEEN_REQUESTS: 500,  // Increase to 500ms
DELAY_BETWEEN_SEASONS: 10000, // Increase to 10s
```

#### 2. Memory Issues
**Symptoms**: Out of memory errors  
**Solutions**:
- Process fewer seasons at once
- Reduce BATCH_SIZE
- Add garbage collection triggers

#### 3. Database Timeouts
**Symptoms**: Connection timeouts during upserts  
**Solutions**:
- Increase database timeout settings
- Process data in smaller batches
- Add connection pooling

#### 4. Incomplete Data
**Symptoms**: Missing records after backfill  
**Solutions**:
- Check API response logs
- Verify network connectivity
- Re-run specific seasons

### Debug Mode

Enable detailed logging:

```javascript
// Add to the script
const DEBUG = true;

if (DEBUG) {
  console.log('🔍 Debug: API Response:', JSON.stringify(data, null, 2));
  console.log('🔍 Debug: Processed rows:', rows.length);
}
```

### Monitoring Progress

```bash
# Monitor database growth
watch -n 30 "psql -c 'SELECT COUNT(*) FROM playergamelogs; SELECT COUNT(*) FROM proplines; SELECT COUNT(*) FROM playeranalytics;'"

# Monitor script output
npm run backfill-historical 2>&1 | tee backfill-$(date +%Y%m%d).log
```

## 🔄 Partial Backfills

### Resume Failed Backfills

If a backfill fails partway through:

1. **Check logs** to see which season failed
2. **Run specific season**:
   ```bash
   npm run backfill-historical:2023
   ```
3. **Verify data** in database
4. **Continue** with remaining seasons

### Incremental Backfills

For ongoing historical data:

```javascript
// Modify SEASONS array to include only missing seasons
const SEASONS = [2024]; // Only backfill 2024
```

## 📊 Data Verification

### Check Backfill Results

```sql
-- Verify game logs by season
SELECT 
  season,
  COUNT(*) as total_records,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_props,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM playergamelogs 
WHERE season IN (2022, 2023, 2024)
GROUP BY season
ORDER BY season;

-- Verify prop lines by season
SELECT 
  season,
  COUNT(*) as total_records,
  COUNT(DISTINCT sportsbook) as sportsbooks,
  COUNT(DISTINCT player_id) as unique_players
FROM proplines 
WHERE season IN (2022, 2023, 2024)
GROUP BY season
ORDER BY season;

-- Verify analytics by season
SELECT 
  season,
  COUNT(*) as total_records,
  AVG(season_pct) as avg_hit_rate,
  COUNT(DISTINCT player_id) as unique_players
FROM playeranalytics 
WHERE season IN (2022, 2023, 2024)
GROUP BY season
ORDER BY season;
```

### Data Quality Checks

```sql
-- Check for missing data
SELECT 
  'Missing Game Logs' as check_type,
  COUNT(*) as count
FROM (SELECT DISTINCT season FROM playergamelogs WHERE season IN (2022,2023,2024)) gl
WHERE season NOT IN (SELECT DISTINCT season FROM playergamelogs);

-- Check data consistency
SELECT 
  pgl.season,
  COUNT(DISTINCT pgl.player_id) as game_log_players,
  COUNT(DISTINCT pl.player_id) as prop_line_players,
  COUNT(DISTINCT pa.player_id) as analytics_players
FROM playergamelogs pgl
LEFT JOIN proplines pl ON pgl.season = pl.season
LEFT JOIN playeranalytics pa ON pgl.season = pa.season
WHERE pgl.season IN (2022, 2023, 2024)
GROUP BY pgl.season
ORDER BY pgl.season;
```

## 🎯 Best Practices

### Before Running Backfill

1. **Check API Limits**: Ensure you have sufficient API quota
2. **Database Space**: Verify sufficient storage space
3. **Network Stability**: Ensure stable internet connection
4. **Time Planning**: Schedule during low-usage periods

### During Backfill

1. **Monitor Progress**: Watch logs for errors
2. **Don't Interrupt**: Let the process complete naturally
3. **Resource Monitoring**: Monitor system resources
4. **Backup Strategy**: Consider database backups

### After Backfill

1. **Verify Results**: Run data quality checks
2. **Performance Testing**: Test application performance
3. **Documentation**: Update data documentation
4. **Monitoring**: Set up ongoing monitoring

## 📚 Related Files

- `scripts/historical-backfill.js` - Main backfill script
- `scripts/analyticsCalculators.js` - Analytics calculation functions
- `supabase/migrations/` - Database schema files
- `package.json` - NPM scripts configuration

## 🎉 Success Metrics

After successful backfill, you should have:

- ✅ **Complete Historical Data**: 2-3 years of player performance data
- ✅ **Rich Analytics**: Precomputed betting analytics for all seasons
- ✅ **Data Consistency**: Consistent data across all tables
- ✅ **Performance Ready**: Optimized for fast query performance

The historical backfill provides a solid foundation for your sports analytics platform! 🚀
