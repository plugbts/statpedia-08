-- Analytics Spot-Check Queries
-- Run these queries to verify backfill results and analytics population

-- 1. Check overall data counts by league and season
SELECT 
  league,
  season,
  COUNT(*) as props_count,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_prop_types,
  MIN(created_at) as earliest_prop,
  MAX(created_at) as latest_prop
FROM proplines 
GROUP BY league, season
ORDER BY league, season;

-- 2. Check game logs counts by league and season
SELECT 
  sport,
  season,
  COUNT(*) as game_logs_count,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_prop_types,
  MIN(date) as earliest_game,
  MAX(date) as latest_game
FROM player_game_logs 
GROUP BY sport, season
ORDER BY sport, season;

-- 3. Spot-check analytics for specific players
SELECT 
  player_id,
  player_name,
  league,
  prop_type,
  line,
  hit_rate_l5_pct,
  hit_rate_l10_pct,
  hit_rate_l20_pct,
  h2h_hit_rate_pct,
  matchup_defensive_rank,
  performance_trend,
  value_indicator,
  date
FROM player_prop_analytics 
WHERE league = 'NFL'
  AND player_name ILIKE '%josh%allen%'
  AND prop_type = 'Passing Yards'
ORDER BY date DESC
LIMIT 10;

-- 4. Check analytics population rates
SELECT 
  league,
  COUNT(*) as total_records,
  COUNT(CASE WHEN hit_rate_l5_pct IS NOT NULL THEN 1 END) as l5_populated,
  COUNT(CASE WHEN hit_rate_l10_pct IS NOT NULL THEN 1 END) as l10_populated,
  COUNT(CASE WHEN hit_rate_l20_pct IS NOT NULL THEN 1 END) as l20_populated,
  COUNT(CASE WHEN h2h_hit_rate_pct IS NOT NULL THEN 1 END) as h2h_populated,
  COUNT(CASE WHEN matchup_defensive_rank IS NOT NULL THEN 1 END) as matchup_populated,
  ROUND(COUNT(CASE WHEN hit_rate_l5_pct IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as l5_pct,
  ROUND(COUNT(CASE WHEN hit_rate_l10_pct IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as l10_pct,
  ROUND(COUNT(CASE WHEN hit_rate_l20_pct IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as l20_pct,
  ROUND(COUNT(CASE WHEN h2h_hit_rate_pct IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as h2h_pct,
  ROUND(COUNT(CASE WHEN matchup_defensive_rank IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as matchup_pct
FROM player_prop_analytics 
GROUP BY league
ORDER BY league;

-- 5. Check for recent data (last 7 days)
SELECT 
  league,
  COUNT(*) as recent_props,
  COUNT(DISTINCT player_id) as recent_players,
  MIN(created_at) as earliest_recent,
  MAX(created_at) as latest_recent
FROM proplines 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY league
ORDER BY league;

-- 6. Check analytics quality by prop type
SELECT 
  league,
  prop_type,
  COUNT(*) as total_records,
  AVG(hit_rate_l10_pct) as avg_l10_hit_rate,
  COUNT(CASE WHEN hit_rate_l10_pct > 0 THEN 1 END) as records_with_l10_data,
  ROUND(COUNT(CASE WHEN hit_rate_l10_pct > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as l10_coverage_pct
FROM player_prop_analytics 
GROUP BY league, prop_type
HAVING COUNT(*) > 0
ORDER BY league, prop_type;

-- 7. Check for missing players (unmapped)
SELECT 
  league,
  COUNT(*) as missing_players,
  COUNT(DISTINCT player_name) as unique_missing_players,
  MIN(created_at) as earliest_missing,
  MAX(created_at) as latest_missing
FROM missing_players 
GROUP BY league
ORDER BY league;

-- 8. Sample analytics records for verification
SELECT 
  player_name,
  league,
  prop_type,
  line,
  hit_rate_l5_pct,
  hit_rate_l10_pct,
  hit_rate_l20_pct,
  h2h_hit_rate_pct,
  matchup_defensive_rank,
  performance_trend,
  value_indicator,
  date
FROM player_prop_analytics 
WHERE league IN ('NFL', 'NBA', 'MLB', 'NHL')
  AND hit_rate_l10_pct IS NOT NULL
  AND hit_rate_l10_pct > 0
ORDER BY RANDOM()
LIMIT 20;

-- 9. Check data freshness and backfill success
SELECT 
  'proplines' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM proplines
UNION ALL
SELECT 
  'player_game_logs' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM player_game_logs
UNION ALL
SELECT 
  'player_prop_analytics' as table_name,
  COUNT(*) as total_records,
  MIN(date) as earliest_record,
  MAX(date) as latest_record,
  COUNT(CASE WHEN date >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as last_24h,
  COUNT(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30d
FROM player_prop_analytics;

-- 10. Performance metrics summary
SELECT 
  'SUMMARY' as metric,
  (SELECT COUNT(*) FROM proplines) as total_props,
  (SELECT COUNT(*) FROM player_game_logs) as total_game_logs,
  (SELECT COUNT(*) FROM player_prop_analytics) as total_analytics,
  (SELECT COUNT(*) FROM missing_players) as missing_players,
  (SELECT COUNT(DISTINCT league) FROM proplines) as leagues_with_data,
  (SELECT COUNT(DISTINCT season) FROM proplines) as seasons_with_data,
  (SELECT COUNT(DISTINCT player_id) FROM proplines) as unique_players,
  (SELECT COUNT(DISTINCT prop_type) FROM proplines) as unique_prop_types;
