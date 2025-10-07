# Batch Ingestion Guide

## 🎯 Goal
Backfill PlayerGameLogs with complete coverage across all leagues and seasons using SportsGameOdds /events endpoint.

## 📊 Database Schema

### PlayerGameLogs Table
```sql
CREATE TABLE PlayerGameLogs (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128),
  team VARCHAR(8),
  opponent VARCHAR(8),
  season INT,
  date DATE,
  prop_type VARCHAR(64),
  value FLOAT,
  position VARCHAR(8),
  sport VARCHAR(8),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Performance Indexes
```sql
-- Fast analytics queries
CREATE INDEX idx_player_season ON playergamelogs(player_id, season);
CREATE INDEX idx_player_opponent ON playergamelogs(player_id, opponent);
CREATE INDEX idx_player_date ON playergamelogs(player_id, date);
CREATE INDEX idx_player_prop_type ON playergamelogs(player_id, prop_type);
CREATE INDEX idx_team_season ON playergamelogs(team, season);
CREATE INDEX idx_date_season ON playergamelogs(date, season);
CREATE INDEX idx_player_prop_season ON playergamelogs(player_id, prop_type, season);
```

## 🚀 Batch Ingestion Scripts

### 1. Complete Backfill (`scripts/batch-ingestion.js`)
**Purpose**: Ingest all historical data (2022-2025) for all leagues

**Usage**:
```bash
# Set API key
export SPORTSGAMEODDS_API_KEY="your_api_key_here"

# Run complete backfill
node scripts/batch-ingestion.js
```

**Features**:
- ✅ Paginated ingestion using `limit=100` and `cursor`
- ✅ Complete coverage across NFL, NBA, MLB, NHL
- ✅ Seasons: 2022, 2023, 2024, 2025
- ✅ Comprehensive team normalization
- ✅ Market type normalization
- ✅ Rate limiting and error handling
- ✅ Progress tracking and detailed logging

### 2. Nightly Updates (`scripts/nightly-ingestion.js`)
**Purpose**: Ingest only the last 24 hours of events for incremental updates

**Usage**:
```bash
# Run nightly ingestion
node scripts/nightly-ingestion.js
```

**Features**:
- ✅ Lightweight incremental updates
- ✅ Only processes yesterday's events
- ✅ Fast execution for scheduled jobs
- ✅ Maintains data freshness

## 🔧 Normalization Functions

### Team Normalization
```javascript
function normalizeOpponent(team, league) {
  // Maps full team names to 3-letter abbreviations
  // Supports NFL, NBA, MLB, NHL
  // Handles partial matching and fallbacks
}
```

### Market Type Normalization
```javascript
function normalizeMarketType(market) {
  // Maps raw API stat types to canonical prop types
  // Examples:
  // "pass yard" → "Passing Yards"
  // "rush yard" → "Rushing Yards"
  // "receptions" → "Receptions"
}
```

### Player ID Normalization
```javascript
function normalizePlayerId(playerName) {
  // Converts player names to consistent IDs
  // Example: "Patrick Mahomes" → "patrick-mahomes"
}
```

## 📋 Operational Notes

### 1. One-Time Backfill
- **Run once** to backfill historical data (2022–2025)
- **Expected result**: Tens of thousands of rows
- **Time**: 30-60 minutes depending on data volume

### 2. Scheduled Nightly Job
- **Run daily** to ingest only the last 24h of events
- **Expected result**: Hundreds to thousands of new rows
- **Time**: 2-5 minutes

### 3. Indexes for Performance
- **Create indexes** on `(player_id, season, prop_type)` for fast queries
- **Analytics queries** will load instantly
- **UI responsiveness** improved dramatically

### 4. UI Guardrails
```javascript
// Show "No data available" when logsCount === 0
if (logsCount === 0) {
  return "No data available";
}

// Show real analytics when data exists
if (hasGameLogs && analytics) {
  return `${hits}/${total} (${percentage}%)`;
}
```

## 🎯 Expected Outcomes

### Before Backfill
- **Analytics**: N/A and 0/0 everywhere
- **Hit Rates**: No data available
- **Streaks**: No data available
- **UI**: Slow loading, placeholder values

### After Backfill
- ✅ **PlayerGameLogs**: Tens of thousands of rows
- ✅ **Analytics**: Real hit rates, streaks, L5/L10/L20
- ✅ **H2H**: Head-to-head performance data
- ✅ **Defensive Rank**: Real matchup rankings
- ✅ **UI**: Instant loading with indexed queries

## 🔍 Verification

### Check Data Volume
```sql
-- Total records by league
SELECT sport, COUNT(*) as records 
FROM playergamelogs 
GROUP BY sport 
ORDER BY records DESC;

-- Records by season
SELECT season, COUNT(*) as records 
FROM playergamelogs 
GROUP BY season 
ORDER BY season DESC;

-- Recent data
SELECT COUNT(*) as recent_records 
FROM playergamelogs 
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
```

### Test Analytics
```javascript
// Should return real data instead of N/A and 0/0
const analytics = await calculateAnalytics(playerId, propType, line, direction);
console.log(analytics);
// Expected: { hits: 15, total: 20, hit_rate: 75 }
```

## 🚨 Troubleshooting

### Common Issues

1. **API Key Missing**
   ```
   Error: SPORTSGAMEODDS_API_KEY not found
   Solution: Set environment variable
   ```

2. **Rate Limiting**
   ```
   Error: API request failed: 429 Too Many Requests
   Solution: Increase delays between requests
   ```

3. **Data Quality Issues**
   ```
   Issue: Inconsistent team names
   Solution: Improve normalization functions
   ```

4. **Performance Issues**
   ```
   Issue: Slow analytics queries
   Solution: Create missing indexes
   ```

## 📊 Monitoring

### Key Metrics
- **Total Records**: Should be 50,000+ after backfill
- **Daily Growth**: 100-1000 new records per day
- **Query Performance**: <100ms for analytics queries
- **Data Freshness**: <24 hours old for current season

### Health Checks
```bash
# Check data volume
node scripts/simple-verification.js

# Test analytics
node scripts/post-ingestion-debug-harness.js

# Verify performance
EXPLAIN ANALYZE SELECT * FROM playergamelogs WHERE player_id = 'mahomes-patrick';
```

## 🎉 Success Criteria

✅ **Data Volume**: PlayerGameLogs fills with tens of thousands of rows
✅ **Analytics**: Real hit rates, streaks, L5/L10/L20, H2H, defensive rank
✅ **Performance**: UI loads instantly with indexed queries
✅ **Freshness**: Nightly updates maintain current data
✅ **Reliability**: Error handling and monitoring in place

The batch ingestion system provides complete coverage and enables real-time analytics across all leagues and seasons! 🚀
