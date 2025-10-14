# Player Props Enrichment Fixes

This directory contains SQL scripts and frontend updates to fix the "–" and "N/A" placeholders in player props by properly populating the enrichment layer.

## Problem Summary

The frontend was showing "–" and "N/A" placeholders because:

1. **Opponent Resolution**: The `opponent` field in `player_game_logs` was NULL, empty, or contained generic placeholders like "OPP"
2. **Missing Streaks**: Streak calculations weren't being computed or stored
3. **Missing Rolling Averages**: L5/L10/L20 averages weren't being calculated
4. **Missing Defensive Ranks**: Opponent defensive rankings weren't being computed
5. **Frontend Not Using Enriched Data**: The frontend was trying to fetch from non-existent API endpoints instead of the enriched database tables

## Solution Overview

### 1. Database Schema Updates
- Fixed opponent resolution in `player_game_logs`
- Created enrichment functions for streaks, rolling averages, and defensive ranks
- Created batch processing functions to populate the `player_analytics` table

### 2. Frontend Updates
- Created new hooks that query the enriched `player_analytics` table directly
- Updated analytics components to use the enriched data
- Added proper fallbacks for missing data

## Files Created

### SQL Scripts
- `fix-enrichment-issues.sql` - Main enrichment functions and batch processing
- `fix-opponent-resolution.sql` - Fixes opponent data resolution issues
- `run-enrichment-jobs.sql` - Executes the enrichment processes

### Frontend Updates
- `src/hooks/usePlayerAnalyticsEnriched.ts` - New hook for enriched analytics
- `src/components/player-props/PlayerAnalyticsCardEnriched.tsx` - Updated analytics components

## How to Apply the Fixes

### Step 1: Run the SQL Scripts

1. **Fix opponent resolution**:
   ```sql
   -- Run this first to fix opponent data
   \i sql/fix-opponent-resolution.sql
   
   -- Test the fix
   SELECT * FROM public.verify_opponent_resolution();
   ```

2. **Create enrichment functions**:
   ```sql
   -- Run the main enrichment script
   \i sql/fix-enrichment-issues.sql
   ```

3. **Run enrichment jobs**:
   ```sql
   -- Run the enrichment processing
   \i sql/run-enrichment-jobs.sql
   
   -- Check enrichment status
   SELECT * FROM public.enrichment_status;
   ```

### Step 2: Update Frontend Components

1. **Replace the old analytics hook**:
   ```typescript
   // Old (in PlayerAnalyticsCard.tsx)
   import { usePlayerAnalytics } from '@/hooks/usePlayerAnalytics';
   
   // New
   import { usePlayerAnalyticsEnriched } from '@/hooks/usePlayerAnalyticsEnriched';
   ```

2. **Update imports in player prop components**:
   ```typescript
   // In 3d-player-prop-card.tsx and other components
   import { PlayerAnalyticsCompactEnriched } from './PlayerAnalyticsCardEnriched';
   ```

### Step 3: Test the Fixes

1. **Check database enrichment**:
   ```sql
   -- Verify analytics data is populated
   SELECT 
     COUNT(*) as total_records,
     COUNT(CASE WHEN current_streak > 0 THEN 1 END) as with_streaks,
     COUNT(CASE WHEN l5_games > 0 THEN 1 END) as with_l5_data,
     COUNT(CASE WHEN matchup_defensive_rank > 0 THEN 1 END) as with_defensive_ranks
   FROM public.player_analytics;
   ```

2. **Test frontend components**:
   - Navigate to player props page
   - Check that analytics cards show real data instead of "–" and "N/A"
   - Verify streaks, hit rates, and defensive ranks are displayed

## Expected Results

After applying these fixes:

1. **Opponent data**: All player props should show proper opponent abbreviations instead of "OPP" or empty values
2. **Streaks**: Current streaks should be displayed (e.g., "3 O" for 3-game over streak)
3. **Rolling averages**: L5/L10/L20 hit rates should show actual percentages
4. **Defensive ranks**: Matchup grades should show "Top 5", "Top 10", etc. instead of "N/A"
5. **Performance grades**: Players should have A/B/C/D grades based on hit rates

## Monitoring and Maintenance

### Regular Enrichment Updates
Run enrichment jobs regularly to keep data fresh:
```sql
-- Refresh all analytics (run daily)
SELECT public.refresh_all_player_analytics();
```

### Monitoring Queries
```sql
-- Check enrichment coverage
SELECT * FROM public.enrichment_status;

-- Find players with missing analytics
SELECT DISTINCT pgl.player_id, pgl.prop_type
FROM public.player_game_logs pgl
LEFT JOIN public.player_analytics pa 
  ON pgl.player_id = pa.player_id 
  AND pgl.prop_type = pa.prop_type
WHERE pa.player_id IS NULL
  AND pgl.season = 2025;
```

### Data Quality Checks
```sql
-- Check for data quality issues
SELECT 
  player_id,
  prop_type,
  current_streak,
  l5_games,
  matchup_defensive_rank,
  last_updated
FROM public.player_analytics
WHERE current_streak < 0 
   OR l5_games < 0 
   OR matchup_defensive_rank < 0;
```

## Troubleshooting

### Common Issues

1. **"No analytics data" in frontend**:
   - Check if `player_analytics` table has data for the specific player/prop
   - Run enrichment jobs for that player: `SELECT public.refresh_player_analytics('player_id', 'prop_type');`

2. **Opponent still showing "OPP"**:
   - Check if opponent resolution was run: `SELECT * FROM public.verify_opponent_resolution();`
   - Run opponent fix: `SELECT public.update_missing_opponents();`

3. **Performance issues**:
   - The enrichment functions are optimized but may take time for large datasets
   - Consider running enrichment jobs in smaller batches
   - Monitor database performance during bulk operations

### Performance Optimization

For large datasets, consider:
1. Running enrichment jobs during off-peak hours
2. Processing players in batches by team or prop type
3. Adding database indexes for frequently queried fields
4. Using database connection pooling for bulk operations

## Next Steps

1. **Automate enrichment**: Set up scheduled jobs to run enrichment regularly
2. **Add more metrics**: Expand analytics to include more advanced metrics
3. **Real-time updates**: Consider real-time enrichment for new game data
4. **API endpoints**: Create REST API endpoints for the enriched data if needed
5. **Caching**: Add caching layer for frequently accessed analytics data
