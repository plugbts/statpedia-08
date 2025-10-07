# Historical Data Integration

This document describes the integration of real historical data from SportsGameOdds and the implementation of PropFinder-style analytics.

## Overview

The system now integrates historical player data to provide comprehensive analytics including:
- Matchup Defensive Rank
- Season Hit Rate (2025)
- H2H Hit Rate (all seasons vs specific opponent)
- Last N Hit Rates (L5, L10, L20)
- Current Streaks
- Chart visualizations with real data

## Architecture

### Database Schema

#### PlayerGameLogs Table
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
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_player_season (player_id, season),
  INDEX idx_player_opponent (player_id, opponent),
  INDEX idx_player_date (player_id, date)
);
```

#### Analytics Table
```sql
CREATE TABLE Analytics (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  prop_type VARCHAR(64) NOT NULL,
  line FLOAT NOT NULL,
  direction VARCHAR(8) NOT NULL, -- 'over' or 'under'
  matchup_rank_value INT,
  matchup_rank_display VARCHAR(16),
  season_hits INT,
  season_total INT,
  season_pct FLOAT,
  h2h_hits INT,
  h2h_total INT,
  h2h_pct FLOAT,
  l5_hits INT,
  l5_total INT,
  l5_pct FLOAT,
  l10_hits INT,
  l10_total INT,
  l10_pct FLOAT,
  l20_hits INT,
  l20_total INT,
  l20_pct FLOAT,
  streak_current INT,
  streak_type VARCHAR(16), -- 'over_hit', 'under_hit', 'mixed'
  last_computed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, prop_type, line, direction)
);
```

### Services

#### 1. HistoricalDataService
- **File**: `src/services/historical-data-service.ts`
- **Purpose**: Ingest historical data from SportsGameOdds API
- **Key Methods**:
  - `ingestHistoricalData(startDate, endDate)`: Fetch and store historical data
  - `fetchEventsWithBoxScores(startDate, endDate)`: Get events with box scores
  - `savePlayerGameLogs(gameLogs)`: Store player game logs in database

#### 2. AnalyticsCalculator
- **File**: `src/services/analytics-calculator.ts`
- **Purpose**: Calculate PropFinder-style analytics
- **Key Methods**:
  - `calculateAnalytics(playerId, playerName, team, opponent, propType, line, direction)`: Main analytics calculation
  - `calculateHitRate(gameLogs, line, direction)`: Calculate hit rate for a set of games
  - `calculateStreak(gameLogs, line, direction)`: Calculate current streak
  - `getDefensiveRank(team, opponent, propType, position)`: Get defensive rank

#### 3. AnalyticsCacheService
- **File**: `src/services/analytics-cache.ts`
- **Purpose**: Precompute and cache analytics for performance
- **Key Methods**:
  - `precomputeAllAnalytics()`: Precompute analytics for all player/prop combinations
  - `getCachedAnalytics(playerId, propType, line, direction)`: Get cached analytics
  - `clearOldCache(daysOld)`: Clean up old cached data

#### 4. ScheduledJobsService
- **File**: `src/services/scheduled-jobs.ts`
- **Purpose**: Run scheduled jobs for data ingestion and analytics precomputation
- **Key Methods**:
  - `runAllJobs()`: Run all scheduled jobs
  - `runDataIngestionJob()`: Ingest new historical data
  - `runAnalyticsPrecomputationJob()`: Precompute analytics
  - `runCacheCleanupJob()`: Clean up old cache

### Normalization Helpers

#### File: `src/utils/normalize.ts`
- `normalizeOpponent(teamNameOrAbbr)`: Convert team names to 3-letter abbreviations
- `normalizeMarketType(marketName)`: Map market names to canonical prop types
- `normalizePosition(pos)`: Map positions to QB, RB, WR, TE
- `normalizeTeam(team)`: Additional team normalization

## Data Flow

### 1. Data Ingestion
```
SportsGameOdds API → HistoricalDataService → PlayerGameLogs Table
```

### 2. Analytics Calculation
```
PlayerGameLogs Table → AnalyticsCalculator → Analytics Table (cached)
```

### 3. UI Display
```
Analytics Table → PlayerPropsColumnView → User Interface
```

## Setup and Deployment

### 1. Database Migration
```bash
# Apply the historical data schema migration
supabase db push
```

### 2. Deploy Scheduled Jobs
```bash
# Deploy the scheduled jobs function
./deploy-scheduled-jobs.sh
```

### 3. Manual Data Ingestion
```typescript
import { historicalDataService } from '@/services/historical-data-service';

// Ingest data for a specific date range
await historicalDataService.ingestHistoricalData('2024-01-01', '2024-12-31');
```

### 4. Manual Analytics Precomputation
```typescript
import { analyticsCacheService } from '@/services/analytics-cache';

// Precompute analytics for all player/prop combinations
await analyticsCacheService.precomputeAllAnalytics();
```

## API Endpoints

### Scheduled Jobs Function
- **URL**: `https://your-project.supabase.co/functions/v1/scheduled-jobs`
- **Methods**: POST
- **Parameters**:
  - `job`: Job type (`data-ingestion`, `analytics-precomputation`, `cache-cleanup`, or `all`)

### Example Usage
```bash
# Run all jobs
curl -X POST 'https://your-project.supabase.co/functions/v1/scheduled-jobs' \
     -H 'Authorization: Bearer YOUR_ANON_KEY'

# Run specific job
curl -X POST 'https://your-project.supabase.co/functions/v1/scheduled-jobs?job=analytics-precomputation' \
     -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Cron Schedule

- **Data Ingestion**: Daily at 1:00 AM UTC
- **Analytics Precomputation**: Daily at 2:00 AM UTC
- **Cache Cleanup**: Weekly on Sunday at 3:00 AM UTC

## Performance Considerations

### Caching Strategy
- Analytics are precomputed nightly and stored in the `Analytics` table
- Real-time calculations fall back to cached data when available
- Cache is cleaned up weekly to remove old data

### Database Indexes
- `idx_player_season`: Optimizes queries by player and season
- `idx_player_opponent`: Optimizes H2H queries
- `idx_player_date`: Optimizes chronological queries

### API Rate Limiting
- SportsGameOdds API calls are rate-limited and cached
- Historical data ingestion is batched to avoid overwhelming the API

## Monitoring and Debugging

### Logging
All services use the centralized logging system:
- `logAPI()`: API calls and responses
- `logSuccess()`: Successful operations
- `logError()`: Error conditions
- `logWarning()`: Warning conditions
- `logInfo()`: General information

### Cache Statistics
```typescript
import { analyticsCacheService } from '@/services/analytics-cache';

const stats = await analyticsCacheService.getCacheStats();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Unique players: ${stats.uniquePlayers}`);
console.log(`Unique props: ${stats.uniqueProps}`);
console.log(`Last updated: ${stats.lastUpdated}`);
```

## Troubleshooting

### Common Issues

1. **No Analytics Data**: Ensure data ingestion has run and analytics have been precomputed
2. **Slow Performance**: Check if analytics are being calculated in real-time instead of using cache
3. **API Rate Limits**: Check SportsGameOdds API usage and implement backoff strategies
4. **Database Errors**: Verify table schemas and indexes are properly created

### Debug Commands

```bash
# Check database schema
supabase db diff

# View function logs
supabase functions logs scheduled-jobs

# Test function locally
supabase functions serve scheduled-jobs
```

## Future Enhancements

1. **Real-time Updates**: Update analytics as new games are completed
2. **Advanced Analytics**: Add more sophisticated statistical measures
3. **Machine Learning**: Implement predictive models for prop performance
4. **Multi-sport Support**: Extend to NBA, MLB, NHL with sport-specific logic
5. **Custom Lines**: Support for custom prop lines beyond common values
6. **Historical Trends**: Track analytics trends over time
7. **Performance Optimization**: Implement more aggressive caching strategies
