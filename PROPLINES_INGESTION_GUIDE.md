# PropLines Ingestion Guide

This guide explains how to set up and run the PropLines ingestion script that fetches player prop odds from the SportsGameOdds API and stores them in your database.

## Overview

The PropLines ingestion script provides comprehensive prop odds data by:

1. **Fetching Prop Odds**: Retrieves current player prop lines from SportsGameOdds API
2. **Market Normalization**: Standardizes market types across different leagues and sportsbooks
3. **Team Normalization**: Converts team names to standard abbreviations
4. **Data Storage**: Stores normalized prop lines in the PropLines table
5. **Error Handling**: Robust error handling with detailed logging and recovery

## Features

### 🎯 Comprehensive Prop Coverage
- **Multi-League Support**: NFL, NBA, MLB, NHL
- **Multiple Sportsbooks**: Aggregates odds from various sportsbooks
- **Real-time Data**: Fetches current prop lines and odds
- **Historical Tracking**: Maintains historical prop line data

### 🔄 Data Normalization
- **Market Type Standardization**: Maps various market names to standard formats
- **Team Name Normalization**: Converts full team names to abbreviations
- **Odds Parsing**: Handles multiple odds formats (+150, -110, etc.)
- **Data Validation**: Ensures data integrity and completeness

### 🛡️ Robust Error Handling
- **Individual League Processing**: Continues if one league fails
- **Pagination Support**: Handles large datasets with cursor-based pagination
- **Rate Limiting**: Built-in delays to avoid API rate limits
- **Duplicate Prevention**: Upsert operations prevent duplicate entries

## Database Schema

### PropLines Table Structure

```sql
CREATE TABLE PropLines (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128) NOT NULL,
  team VARCHAR(8) NOT NULL,
  opponent VARCHAR(8),
  season INTEGER NOT NULL,
  date DATE NOT NULL,
  prop_type VARCHAR(64) NOT NULL,
  line DECIMAL(10,2) NOT NULL,           -- Sportsbook line
  over_odds INTEGER,                     -- Over odds (e.g., -110, +150)
  under_odds INTEGER,                    -- Under odds (e.g., -110, +150)
  sportsbook VARCHAR(32) DEFAULT 'Consensus',
  league VARCHAR(8) NOT NULL,            -- nfl, nba, mlb, nhl
  game_id VARCHAR(64),                   -- Reference to game
  position VARCHAR(8),                   -- Player position
  is_active BOOLEAN DEFAULT true,        -- Whether the line is still active
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(player_id, date, prop_type, sportsbook, line)
);
```

## Market Type Normalization

The script includes comprehensive market type normalization for all supported leagues:

### NFL Markets
- **Passing**: Passing Yards, Passing TDs, Passing Completions, Passing Attempts
- **Rushing**: Rushing Yards, Rushing TDs
- **Receiving**: Receiving Yards, Receiving TDs, Receptions
- **Defense**: Interceptions

### NBA Markets
- **Scoring**: Points, 3-Pointers Made, Free Throws Made
- **Playmaking**: Assists, Steals
- **Rebounding**: Rebounds
- **Defense**: Blocks, Turnovers

### MLB Markets
- **Hitting**: Hits, Runs, RBIs, Home Runs, Walks
- **Pitching**: Strikeouts

### NHL Markets
- **Scoring**: Goals, Assists, Points
- **Shooting**: Shots
- **Goaltending**: Saves

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

### 2. Database Setup

Run the PropLines table migration:

```bash
# Apply the PropLines table migration
supabase db push
```

Or manually execute the SQL from:
`supabase/migrations/20250103000006_create_proplines_table.sql`

### 3. Dependencies

Ensure these dependencies are installed:
```bash
npm install @supabase/supabase-js node-fetch dotenv
```

## Usage

### Manual Execution

```bash
# Run PropLines ingestion for all leagues
npm run ingest-proplines

# Run as part of nightly job
npm run nightly-job:proplines-only

# Run complete nightly job (includes PropLines)
npm run nightly-job
```

### Programmatic Usage

```javascript
import { ingestPropLines, ingestLeagueProps } from './scripts/proplines-ingestion.js';

// Ingest all leagues
const results = await ingestPropLines();

// Ingest specific league
const nflResults = await ingestLeagueProps('nfl');
```

## API Integration

### SportsGameOdds API Endpoints

The script uses the following API endpoints:

```
GET https://api.sportsgameodds.com/v1/{league}/props?limit=100&cursor={cursor}
```

### Request Headers
```javascript
{
  'x-api-key': 'your_api_key'
}
```

### Response Format
```javascript
{
  "props": [
    {
      "player": {
        "id": "player_id",
        "name": "Player Name",
        "position": "QB"
      },
      "team": "Team Name",
      "opponent": "Opponent Team",
      "season": 2025,
      "date": "2025-01-03",
      "market": "Passing Yards",
      "line": 275.5,
      "overOdds": "+110",
      "underOdds": "-110",
      "sportsbook": "DraftKings",
      "gameId": "game_id"
    }
  ],
  "nextCursor": "cursor_token"
}
```

## Data Flow

```
SportsGameOdds API → Prop Data → Normalization → Validation → PropLines Table
         ↓                ↓            ↓             ↓              ↓
    API Requests    Raw Prop Data   Team Names    Data Checks   Upsert Ops
    Pagination      Market Types    Market Types  Required      Duplicate
    Rate Limiting   Odds Data      Odds Parsing  Fields        Prevention
```

## Performance Considerations

### Batch Processing
- Processes 100 props per API request
- Uses cursor-based pagination for large datasets
- Built-in delays between requests (100ms)

### Database Optimization
- Upsert operations prevent duplicates
- Indexes on frequently queried columns
- Automatic timestamp updates

### Memory Management
- Processes data in batches to avoid memory issues
- Cleans up processed data immediately

## Monitoring and Logs

### Log Output
The script provides detailed logging with:
- Progress indicators for each league and page
- Record counts and processing statistics
- Error details with context
- Execution time tracking

### Key Metrics to Monitor
- **API Response Times**: Monitor SportsGameOdds API performance
- **Record Processing**: Track records processed per league
- **Error Rates**: Monitor failed requests and data validation errors
- **Data Freshness**: Ensure prop lines are current

### Example Log Output
```
🎯 Starting PropLines ingestion...
⏰ Started at: 2025-01-03T02:00:00.000Z
============================================================

📊 Fetching prop lines for NFL...
  📄 Fetching page 1...
  📝 Processing 100 props from page 1...
  💾 Upserting 100 prop lines...
  ✅ Upserted 100 prop lines (total 100)
  📄 Fetching page 2...
  📝 Processing 85 props from page 2...
  💾 Upserting 85 prop lines...
  ✅ Upserted 85 prop lines (total 185)
✅ Finished NFL prop ingestion: 185 rows

📊 PropLines Ingestion Summary:
========================================
NFL: 185 records
NBA: 142 records
MLB: 98 records
NHL: 76 records

🎉 Total: 501 prop lines ingested
✅ PropLines ingestion complete!
```

## Error Handling

### Common Issues and Solutions

1. **API Rate Limiting**
   - **Symptom**: HTTP 429 errors
   - **Solution**: Increase delays between requests
   - **Prevention**: Built-in rate limiting with 100ms delays

2. **Invalid Market Types**
   - **Symptom**: Skipped props with missing market data
   - **Solution**: Update MARKET_TYPE_MAP with new market types
   - **Prevention**: Comprehensive normalization mapping

3. **Database Connection Issues**
   - **Symptom**: Supabase connection errors
   - **Solution**: Verify environment variables and network connectivity
   - **Prevention**: Connection validation and retry logic

4. **Data Validation Errors**
   - **Symptom**: Skipped props with missing required fields
   - **Solution**: Review API response format changes
   - **Prevention**: Comprehensive field validation

### Debug Mode

Run with verbose logging:

```bash
DEBUG=true npm run ingest-proplines
```

## Integration with Nightly Job

The PropLines ingestion is integrated into the combined nightly job:

### Execution Order
1. **Incremental Ingestion**: Fetch last 24h of game logs
2. **PropLines Ingestion**: Fetch current prop odds
3. **Analytics Precomputation**: Calculate analytics using both datasets

### Benefits
- **Coordinated Data Pipeline**: Ensures data consistency across tables
- **Error Isolation**: Each step can succeed independently
- **Performance Optimization**: Shared database connections and resources

## Security Considerations

### API Key Management
- Store API keys in environment variables
- Rotate keys regularly
- Monitor API usage and limits

### Data Privacy
- No personal data is collected
- All data is public sports information
- Proper RLS policies on PropLines table

### Rate Limiting
- Built-in delays prevent API abuse
- Monitor API usage quotas
- Implement backoff strategies for rate limits

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live odds
- **Historical Analysis**: Prop line movement tracking
- **Arbitrage Detection**: Identify betting opportunities
- **Performance Metrics**: Detailed API and processing metrics

### Scalability Improvements
- **Parallel Processing**: Process multiple leagues simultaneously
- **Caching Layer**: Redis integration for frequently accessed data
- **Load Balancing**: Distribute processing across multiple instances
- **Auto-scaling**: Dynamic resource allocation based on load

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor API key expiration
- Update team mappings for league changes
- Review market type mappings for new prop types
- Clean up old inactive prop lines
- Monitor database storage usage

### Backup and Recovery
- Regular database backups including PropLines table
- API response caching for disaster recovery
- Data validation checks and integrity monitoring

This PropLines ingestion system provides a robust foundation for storing and managing player prop odds data, enabling advanced analytics and betting insights for your sports platform.
