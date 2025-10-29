-- Validation queries for v_props_list view replacement
-- Run these after applying scripts/replace-view-v-props-list.sql

-- 1. Basic view structure check - should return without error
\d v_props_list

-- 2. Count total records
SELECT 'Total records' as check_name, COUNT(*) as result
FROM v_props_list;

-- 3. Check for missing teams
SELECT 'Missing teams' as check_name, COUNT(*) as result
FROM v_props_list 
WHERE team IS NULL;

-- 4. Check for missing opponents
SELECT 'Missing opponents' as check_name, COUNT(*) as result
FROM v_props_list 
WHERE opponent IS NULL;

-- 5. Check analytics population
SELECT 
  'Analytics populated' as check_name,
  COUNT(*) as total,
  COUNT(ev_percent) as has_ev,
  COUNT(l5) as has_l5,
  COUNT(l10) as has_l10,
  COUNT(l20) as has_l20,
  COUNT(current_streak) as has_streak,
  ROUND(COUNT(l5) * 100.0 / NULLIF(COUNT(*), 0), 2) as l5_pct,
  ROUND(COUNT(l10) * 100.0 / NULLIF(COUNT(*), 0), 2) as l10_pct
FROM v_props_list;

-- 6. Check team logos for major leagues
SELECT 
  'Logos for major leagues' as check_name,
  league,
  COUNT(*) as total,
  COUNT(team_logo) as has_team_logo,
  COUNT(opponent_logo) as has_opponent_logo,
  ROUND(COUNT(team_logo) * 100.0 / NULLIF(COUNT(*), 0), 2) as team_logo_pct,
  ROUND(COUNT(opponent_logo) * 100.0 / NULLIF(COUNT(*), 0), 2) as opp_logo_pct
FROM v_props_list
WHERE league IN ('NFL', 'NBA', 'MLB', 'NHL')
GROUP BY league
ORDER BY league;

-- 7. Sample output for NFL
SELECT 
  'Sample NFL props' as check_name,
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
  LEFT(team_logo, 50) as team_logo_preview,
  LEFT(opponent_logo, 50) as opp_logo_preview
FROM v_props_list
WHERE league = 'NFL'
LIMIT 5;

-- 8. Sample output for NBA
SELECT 
  'Sample NBA props' as check_name,
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
  LEFT(team_logo, 50) as team_logo_preview,
  LEFT(opponent_logo, 50) as opp_logo_preview
FROM v_props_list
WHERE league = 'NBA'
LIMIT 5;

-- 9. Check for data quality issues
SELECT 
  'Data quality checks' as check_name,
  COUNT(CASE WHEN team = 'UNK' OR team = '?' THEN 1 END) as unk_teams,
  COUNT(CASE WHEN opponent = 'UNK' OR opponent = '?' THEN 1 END) as unk_opponents,
  COUNT(CASE WHEN team_logo LIKE '%undefined%' OR team_logo LIKE '%null%' THEN 1 END) as invalid_team_logos,
  COUNT(CASE WHEN opponent_logo LIKE '%undefined%' OR opponent_logo LIKE '%null%' THEN 1 END) as invalid_opp_logos
FROM v_props_list;

-- 10. Analytics field distribution
SELECT 
  'Analytics distribution' as check_name,
  league,
  COUNT(*) as total_props,
  ROUND(AVG(CASE WHEN ev_percent IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as ev_pct_populated,
  ROUND(AVG(CASE WHEN l5 IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as l5_populated,
  ROUND(AVG(CASE WHEN l10 IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as l10_populated,
  ROUND(AVG(CASE WHEN l20 IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as l20_populated,
  ROUND(AVG(CASE WHEN current_streak IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as has_streak
FROM v_props_list
GROUP BY league
ORDER BY league;

-- Expected results:
-- ✓ No missing teams (or very few)
-- ✓ No missing opponents (or very few, should be 0 after backfill)
-- ✓ team_logo and opponent_logo populated for NFL/NBA/MLB/NHL (should be ~100%)
-- ✓ Analytics fields populated where player_enriched_stats or player_analytics data exists
-- ✓ No 'UNK' or '?' values for team/opponent
-- ✓ current_streak defaults to 0 when NULL
