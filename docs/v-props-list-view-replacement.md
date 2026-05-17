# v_props_list View Replacement - Documentation

## Overview
This document describes the changes made to the `v_props_list` view to fix syntax errors and add robust fallback mechanisms for team abbreviations, opponent abbreviations, team logos, and analytics data.

## Problem Statement
The original `v_props_list` view had the following issues:
1. **Syntax errors**: Stray colon after opponent subquery
2. **Missing team/opponent data**: UNK/? showing for teams
3. **Missing analytics**: Dash (-) showing for Streak/L5/L10/etc fields

## Solution
Created `scripts/replace-view-v-props-list.sql` with the following improvements:

### 1. Syntax Fixes
- Removed stray colon after opponent subquery joins
- Properly structured all LEFT JOIN subqueries with correct Postgres 15 syntax
- Qualified all column references explicitly

### 2. Team Abbreviation Resolution (Priority Order)
```sql
COALESCE(
  t.abbreviation,              -- Direct team join via player.team_id
  t_pgl.abbreviation,          -- Team from player_game_logs
  CASE                         -- Fallback to games table
    WHEN g.home_team_id = p.team_id THEN th.abbreviation
    WHEN g.away_team_id = p.team_id THEN ta.abbreviation
    ELSE NULL
  END
)
```

### 3. Opponent Abbreviation Resolution (Priority Order)
```sql
COALESCE(
  opp.abbreviation,            -- Opponent from player_enriched_stats via opponent_team_id
  t_pgl_opp.abbreviation,      -- Opponent from player_game_logs
  CASE                         -- Fallback to games table (inverse of player's team)
    WHEN g.home_team_id = p.team_id THEN ta.abbreviation
    WHEN g.away_team_id = p.team_id THEN th.abbreviation
    ELSE NULL
  END
)
```

### 4. ESPN Logo URLs (NFL/NBA/MLB/NHL only)
```sql
-- Team logo
CASE WHEN league_code IN ('nfl','nba','mlb','nhl') THEN
  format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', 
         league_code, 
         LOWER(team_abbrev))
END

-- Opponent logo
CASE WHEN league_code IN ('nfl','nba','mlb','nhl') THEN
  format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', 
         league_code, 
         LOWER(opponent_abbrev))
END
```

### 5. Analytics Fields with Fallbacks
All analytics fields use this priority:
1. **Primary source**: `player_enriched_stats` (pes)
2. **Fallback**: `player_analytics` (pa_exact for exact season, pa_latest for latest season)

Fields with fallbacks:
- `ev_percent`: Expected value percentage
- `l5`, `l10`, `l20`: Last 5/10/20 games performance
- `h2h_avg`: Head-to-head average vs opponent
- `season_avg`: Season average
- `matchup_rank`: Matchup defensive rank
- `rating`: Performance rating
- `current_streak`: Current streak (defaults to 0 if NULL)

### 6. Player Analytics Join Strategy
```sql
-- Exact season match (preferred)
LEFT JOIN player_analytics pa_exact
  ON pa_exact.player_id = pp.player_id
 AND pa_exact.prop_type = pt.name
 AND pa_exact.season = EXTRACT(YEAR FROM g.game_date)::text

-- Latest season fallback (only if no exact match)
LEFT JOIN LATERAL (
  SELECT pa2.*
  FROM player_analytics pa2
  WHERE pa2.player_id = pp.player_id
    AND pa2.prop_type = pt.name
  ORDER BY pa2.season DESC NULLS LAST
  LIMIT 1
) pa_latest ON pa_exact.player_id IS NULL

-- Coalesce the two sources for convenience
CROSS JOIN LATERAL (
  SELECT
    COALESCE(pa_exact.ev_percent, pa_latest.ev_percent) AS pa_ev_percent,
    COALESCE(pa_exact.l5, pa_latest.l5) AS pa_l5,
    -- ... other fields
) pa_ev
```

## Table Dependencies
The view depends on these tables:
- `player_props` (pp) - Main props data
- `players` (p) - Player information
- `prop_types` (pt) - Prop type definitions
- `games` (g) - Game information
- `leagues` (l) - League data
- `teams` (t, th, ta) - Team information
- `player_enriched_stats` (pes) - Primary analytics source
- `player_game_logs` (pgl) - Historical game logs for fallback
- `player_analytics` (pa) - Secondary analytics source with season tracking

## Application Steps

### 1. Apply the View
```bash
# Option A: Using the provided script
./scripts/apply-view-replacement.sh

# Option B: Using psql directly
psql "$DATABASE_URL" -f scripts/replace-view-v-props-list.sql

# Option C: Using npm (if db:apply-sql-file command exists)
npm run db:apply-sql-file scripts/replace-view-v-props-list.sql
```

### 2. Backfill Opponents (if needed)
```bash
npm run db:backfill:opponents
```

### 3. Verify the Changes
```bash
# Spot-check analytics
psql "$DATABASE_URL" -f verify-analytics-spot-check.sql

# Or run diagnostics
npx tsx scripts/run-analytics-diagnostics.ts
```

### 4. Quick Validation Queries
```sql
-- Check for missing teams
SELECT COUNT(*) as missing_team_count
FROM v_props_list 
WHERE team IS NULL;

-- Check for missing opponents
SELECT COUNT(*) as missing_opponent_count
FROM v_props_list 
WHERE opponent IS NULL;

-- Check analytics population
SELECT 
  COUNT(*) as total,
  COUNT(ev_percent) as has_ev,
  COUNT(l5) as has_l5,
  COUNT(l10) as has_l10,
  COUNT(current_streak) as has_streak
FROM v_props_list;

-- Sample output
SELECT 
  id,
  full_name,
  team,
  opponent,
  market,
  line,
  ev_percent,
  l5,
  l10,
  current_streak,
  team_logo,
  opponent_logo
FROM v_props_list
WHERE league IN ('NFL', 'NBA', 'MLB', 'NHL')
LIMIT 10;
```

## Expected Outcomes
After applying this view:
1. ✅ View creation succeeds (syntax fixed)
2. ✅ Team/opponent abbreviations populated for NFL/NBA/MLB/NHL
3. ✅ Team/opponent logos generated for NFL/NBA/MLB/NHL
4. ✅ l5/l10/l20/streak/ev_percent populated when analytics exist
5. ✅ missing_opponent_team_id: 0 after backfill (if run)
6. ✅ No UNK/? showing for teams
7. ✅ No dash (-) showing for analytics fields where data exists

## Postgres 15 Compatibility
The view is fully compatible with Postgres 15 and uses:
- Standard COALESCE functions
- LATERAL joins for computed columns
- CROSS JOIN LATERAL for derived values
- Explicit table qualification for all columns
- Standard text casting (::text, ::numeric)
- format() function for string interpolation

## Constraints
- **View-only change**: No table schemas were altered
- **Backward compatible**: Output columns match original view (team, opponent, etc.)
- **Extensible**: Easy to add more analytics fields or fallback sources

## Maintenance Notes
- If `player_analytics` table structure changes, update lines 77-100
- If `player_enriched_stats` columns change, update lines 136-147
- To add more logo providers, update lines 126-134
- To support more leagues for logos, update the IN clause (line 128, 131)
