# Backfill Job Execution Guide

Quick guide to run the historical backfill job (`backfillJob.js`) to populate your database with historical data.

## 🎯 Overview

The `backfillJob.js` script will:

1. **Loop through specified seasons** (configured in `SEASONS` array)
2. **Ingest PlayerGameLogs** for each season → `playergamelogs` table
3. **Ingest PropLines** for each season → `proplines` table  
4. **Precompute Analytics** for each season → `playeranalytics` table

After completion, your `playeranalytics` table will have full historical hit rates and streaks.

## 🚀 Quick Start

### Option 1: Automated Script (Recommended)

```bash
# Run the automated script
./run-backfill.sh
```

### Option 2: Direct Execution

```bash
# Run directly with Node.js
node backfillJob.js
```

### Option 3: NPM Script

```bash
# Using npm script
npm run backfill-historical
```

## ⚙️ Setup Requirements

### 1. Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SPORTSGAMEODDS_API_KEY=your_api_key
```

### 2. Configure Seasons

Edit the `SEASONS` array in `backfillJob.js`:

```javascript
// Configure seasons to backfill
const SEASONS = [2022, 2023, 2024]; // Adjust this list as needed
```

### 3. Dependencies

Ensure you have the required dependencies:

```bash
npm install
```

## 📊 Expected Results

After successful execution, you'll have:

### Database Tables Populated:

- **`playergamelogs`**: Historical player performance data
- **`proplines`**: Historical sportsbook prop lines
- **`playeranalytics`**: Precomputed hit rates and streaks

### Sample Data Volume (3 seasons):

- **Game Logs**: ~53,000 records
- **Prop Lines**: ~45,000 records  
- **Analytics**: ~9,000 records

## ⏱️ Runtime Expectations

| Seasons | Estimated Time | Data Volume |
|---------|---------------|-------------|
| 1 season | 5-7 minutes | ~18k records |
| 2 seasons | 10-14 minutes | ~36k records |
| 3 seasons | 15-21 minutes | ~54k records |

## 🔧 Configuration Options

### Performance Tuning

Edit the `CONFIG` object in `backfillJob.js`:

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

Modify the `LEAGUES` array:

```javascript
const LEAGUES = ["nfl", "nba", "mlb", "nhl"]; // Adjust as needed
```

## 🖥️ Execution Environments

### Local Development

```bash
# Run locally
./run-backfill.sh

# Or directly
node backfillJob.js
```

### Serverless Environment

#### AWS Lambda

```javascript
// lambda/handler.js
exports.handler = async (event) => {
  // Import and run backfill
  const { runBackfill } = require('./backfillJob.js');
  
  try {
    await runBackfill();
    return { statusCode: 200, body: 'Backfill completed' };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};
```

#### Vercel Functions

```javascript
// api/backfill.js
import { runBackfill } from '../backfillJob.js';

export default async function handler(req, res) {
  try {
    await runBackfill();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Google Cloud Functions

```javascript
// index.js
const { runBackfill } = require('./backfillJob.js');

exports.backfillJob = async (req, res) => {
  try {
    await runBackfill();
    res.status(200).send('Backfill completed');
  } catch (error) {
    res.status(500).send(error.message);
  }
};
```

## 📊 Monitoring Progress

### Real-time Monitoring

The script provides detailed progress updates:

```
🚀 Starting Historical Backfill Job
⏰ Started at: 2025-01-03T10:30:00.000Z
📅 Seasons to process: 2022, 2023, 2024

🔄 BACKFILLING SEASON 2022 (1/3)
📊 Processing NFL 2022 game logs...
  📊 Processed 1,000 records...
✅ NFL 2022: 5,250 game log records
```

### Database Monitoring

Monitor database growth in real-time:

```sql
-- Check current record counts
SELECT 
  (SELECT COUNT(*) FROM playergamelogs) as game_logs,
  (SELECT COUNT(*) FROM proplines) as prop_lines,
  (SELECT COUNT(*) FROM playeranalytics) as analytics;
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. API Key Issues
```bash
❌ API request failed: 401 Unauthorized
```
**Solution**: Verify your `SPORTSGAMEODDS_API_KEY` is correct

#### 2. Database Connection Issues
```bash
❌ Supabase connection failed
```
**Solution**: Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

#### 3. Rate Limiting
```bash
❌ Rate limited, waiting 2000ms before retry
```
**Solution**: The script handles this automatically with exponential backoff

#### 4. Memory Issues
```bash
❌ JavaScript heap out of memory
```
**Solution**: Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 backfillJob.js
```

### Debug Mode

Enable detailed logging by modifying the script:

```javascript
// Add at the top of backfillJob.js
const DEBUG = true;

// Add debug logging throughout
if (DEBUG) {
  console.log('🔍 Debug: Processing', league, season, 'with', rows.length, 'records');
}
```

## ✅ Verification

### Check Results

After completion, verify the data:

```sql
-- Verify by season
SELECT 
  season,
  COUNT(*) as records,
  MIN(date) as earliest,
  MAX(date) as latest
FROM playergamelogs 
GROUP BY season 
ORDER BY season;

-- Check analytics completeness
SELECT 
  season,
  COUNT(*) as analytics_records,
  AVG(season_pct) as avg_hit_rate
FROM playeranalytics 
GROUP BY season 
ORDER BY season;
```

### Data Quality Checks

```sql
-- Check for missing data
SELECT 
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_props,
  COUNT(DISTINCT season) as seasons_covered
FROM playeranalytics;

-- Check data consistency
SELECT 
  COUNT(*) as total_analytics,
  COUNT(CASE WHEN season_pct > 0 THEN 1 END) as with_hit_rates,
  COUNT(CASE WHEN streak_current > 0 THEN 1 END) as with_streaks
FROM playeranalytics;
```

## 🎉 Success Criteria

After successful execution, you should have:

- ✅ **Complete Historical Data**: Multiple seasons of player performance
- ✅ **Rich Analytics**: Hit rates (L5, L10, L20, season) for all players/props
- ✅ **Streak Data**: Current and longest streaks for betting analysis
- ✅ **Data Consistency**: Proper joins between game logs and prop lines
- ✅ **Performance Ready**: Optimized data structure for fast queries

Your `playeranalytics` table will now contain comprehensive historical hit rates and streaks ready for your sports betting analytics platform! 🚀

## 📞 Support

If you encounter issues:

1. Check the logs for specific error messages
2. Verify your API key and database credentials
3. Ensure sufficient database storage space
4. Check network connectivity for API calls
5. Review the configuration settings in the script

The backfill job is designed to be robust and handle most common issues automatically.
