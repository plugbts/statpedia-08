# Player ID Map Auto-Population Implementation Guide

## Overview
This guide covers the implementation of dynamic player ID mapping that auto-populates from the Supabase `players` table, replacing the hardcoded `PLAYER_ID_MAP` with a dynamic system that loads player data at runtime.

## Files Created/Modified

### 1. Core Implementation Files
- **`cloudflare-worker/src/normalizeName.ts`** - Name normalization utilities
- **`cloudflare-worker/src/playersLoader.ts`** - Dynamic player loading from Supabase
- **`cloudflare-worker/src/createPlayerPropsFromOdd.ts`** - Updated to use dynamic loading
- **`supabase/migrations/20250103000010_create_players_table.sql`** - Players table schema

### 2. Utility Scripts
- **`cloudflare-worker/populate-players-table.js`** - Bulk player data insertion
- **`cloudflare-worker/test-dynamic-player-loading.js`** - Test dynamic loading functionality

## Implementation Details

### Dynamic Player Loading System
The new system replaces the hardcoded `PLAYER_ID_MAP` with:

1. **`getCachedPlayerIdMap(env)`** - Loads players from Supabase with 30-minute caching
2. **`loadPlayerIdMapByLeague(env, league)`** - League-specific player loading
3. **`updateMissingPlayersSuccess(env, playerName, canonicalId)`** - Updates missing players table

### Name Normalization
- **`normalizeName(name)`** - Standard normalization (remove punctuation, normalize spaces)
- **`aggressiveNormalizeName(name)`** - Aggressive normalization (remove all non-word chars)
- **`generateNameVariations(name)`** - Creates multiple variations for fuzzy matching

### Database Schema
The `players` table includes:
- `player_id` (TEXT, UNIQUE) - Canonical player ID
- `full_name` (TEXT) - Display name
- `first_name`, `last_name` (TEXT) - Parsed names
- `team` (TEXT) - Team abbreviation
- `league` (TEXT) - League (NFL, NBA, MLB, NHL)
- `position` (TEXT) - Player position
- `sport` (TEXT) - Sport name
- `is_active` (BOOLEAN) - Active status

## Deployment Steps

### Step 1: Deploy Database Schema
```bash
# Apply the players table migration
cd supabase
supabase db push
```

### Step 2: Populate Players Table
```bash
# Run the population script
cd cloudflare-worker
node populate-players-table.js
```

### Step 3: Test Dynamic Loading
```bash
# Test the dynamic loading functionality
node test-dynamic-player-loading.js
```

### Step 4: Deploy Updated Worker
```bash
# Deploy the updated Cloudflare Worker
cd cloudflare-worker
wrangler deploy
```

### Step 5: Verify Integration
```bash
# Run the sanity test
node test-sanity.js
```

## Key Features

### 1. Automatic Player Mapping
- Loads canonical player IDs from Supabase
- Supports fuzzy matching with name variations
- Caches results for 30 minutes to improve performance

### 2. Missing Player Tracking
- Automatically stores unmapped players in `missing_players` table
- Removes players from missing list when mappings are found
- Provides reconciliation data for manual review

### 3. Multi-League Support
- Supports NFL, NBA, MLB, NHL players
- League-specific loading for targeted updates
- Sport-specific normalization rules

### 4. Performance Optimization
- Caching system reduces API calls
- Batch processing for large datasets
- Efficient indexing for fast lookups

## Configuration

### Environment Variables
Ensure these are set in your Cloudflare Worker:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Caching Configuration
Modify cache TTL in `playersLoader.ts`:
```typescript
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
```

## Monitoring and Maintenance

### 1. Monitor Missing Players
```sql
-- Check unmapped players
SELECT * FROM missing_players 
ORDER BY count DESC, last_seen DESC 
LIMIT 50;
```

### 2. Update Player Data
```sql
-- Add new players
INSERT INTO players (player_id, full_name, team, league, position, sport)
VALUES ('NEW_PLAYER-ID', 'New Player', 'TEAM', 'LEAGUE', 'POS', 'sport');
```

### 3. Verify Mapping Success
```sql
-- Check mapping coverage
SELECT 
  league,
  COUNT(*) as total_players,
  COUNT(CASE WHEN player_id LIKE '%-UNK-%' THEN 1 END) as unmapped
FROM proplines 
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY league;
```

## Troubleshooting

### Common Issues

1. **Player Not Found**
   - Check if player exists in `players` table
   - Verify name normalization is working
   - Check for typos in player names

2. **Performance Issues**
   - Verify caching is working
   - Check database indexes
   - Monitor API response times

3. **Mapping Errors**
   - Review `missing_players` table
   - Check name variations
   - Verify team/league consistency

### Debug Commands
```bash
# Test specific player lookup
node -e "
const { getCachedPlayerIdMap } = require('./src/playersLoader');
getCachedPlayerIdMap({SUPABASE_URL: '...', SUPABASE_SERVICE_KEY: '...'})
  .then(map => console.log('Josh Allen:', map['josh allen']));
"
```

## Next Steps

### 1. Expand Player Database
- Add more players from external APIs
- Implement automated player data updates
- Add player metadata (age, height, weight)

### 2. Improve Matching
- Implement fuzzy string matching
- Add nickname support
- Handle name changes and trades

### 3. Analytics Integration
- Track mapping success rates
- Monitor performance metrics
- Generate reconciliation reports

### 4. API Integration
- Connect to sports data APIs
- Implement real-time player updates
- Add player statistics integration

## Benefits

1. **Maintainability** - No more hardcoded player lists
2. **Scalability** - Easy to add new players and leagues
3. **Accuracy** - Centralized player data management
4. **Performance** - Caching and efficient lookups
5. **Observability** - Missing player tracking and reconciliation

## Conclusion

The dynamic player ID mapping system provides a robust, scalable solution for managing player data in the props ingestion pipeline. It eliminates the need for hardcoded mappings while providing comprehensive tracking and reconciliation capabilities.

The system is designed to be self-maintaining, automatically identifying and tracking unmapped players while providing the tools needed for manual reconciliation and data quality improvement.
