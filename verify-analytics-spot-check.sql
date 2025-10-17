-- Analytics Spot-Check Queries (updated for current schema)
-- Uses:
--   - player_props (instead of legacy proplines)
--   - player_analytics (instead of legacy player_prop_analytics)
--   - player_game_logs
--   - games/leagues/prop_types/players for league/season resolution

SELECT 
  l.abbreviation AS league,
  EXTRACT(YEAR FROM g.game_date)::text AS season,
  COUNT(*) AS props_count,
  COUNT(DISTINCT pp.player_id) AS unique_players,
  COUNT(DISTINCT pp.prop_type_id) AS unique_prop_types,
  MIN(pp.created_at) AS earliest_prop,
  MAX(pp.created_at) AS latest_prop
FROM public.player_props pp
JOIN public.games g ON g.id = pp.game_id
JOIN public.leagues l ON l.id = g.league_id
GROUP BY l.abbreviation, EXTRACT(YEAR FROM g.game_date)
ORDER BY l.abbreviation, season;

SELECT 
  l.abbreviation AS league,
  COALESCE(pgl.season, EXTRACT(YEAR FROM g.game_date)::text) AS season,
  COUNT(*) AS game_logs_count,
  COUNT(DISTINCT pgl.player_id) AS unique_players,
  COUNT(DISTINCT pgl.prop_type) AS unique_prop_types,
  MIN(COALESCE(pgl.game_date, g.game_date)) AS earliest_game,
  MAX(COALESCE(pgl.game_date, g.game_date)) AS latest_game
FROM public.player_game_logs pgl
LEFT JOIN public.games g ON g.id = pgl.game_id
LEFT JOIN public.leagues l ON l.id = g.league_id
GROUP BY l.abbreviation, COALESCE(pgl.season, EXTRACT(YEAR FROM g.game_date)::text)
ORDER BY l.abbreviation, season;

SELECT 
  p.id AS player_id,
  p.full_name AS player_name,
  l.abbreviation AS league,
  pt.name AS prop_type,
  pp.line,
  pp.over_odds AS over_odds_raw,
  pp.under_odds AS under_odds_raw,
  pa.l5, pa.l10, pa.l20, pa.current_streak, pa.h2h_avg, pa.season_avg, pa.ev_percent, pa.matchup_rank,
  g.game_date AS date
FROM public.players p
JOIN public.player_props pp ON pp.player_id = p.id
JOIN public.prop_types pt ON pt.id = pp.prop_type_id
JOIN public.games g ON g.id = pp.game_id
JOIN public.leagues l ON l.id = g.league_id
LEFT JOIN public.player_analytics pa
  ON pa.player_id = p.id AND pa.prop_type = pt.name AND pa.season = EXTRACT(YEAR FROM g.game_date)::text
WHERE l.abbreviation = 'NFL'
  AND p.full_name ILIKE '%josh%allen%'
  AND pt.name = 'Passing Yards'
ORDER BY g.game_date DESC
LIMIT 10;

SELECT 
  lg.league,
  COUNT(*) AS total_records,
  COUNT(CASE WHEN pa.l5 IS NOT NULL THEN 1 END) AS l5_populated,
  COUNT(CASE WHEN pa.l10 IS NOT NULL THEN 1 END) AS l10_populated,
  COUNT(CASE WHEN pa.l20 IS NOT NULL THEN 1 END) AS l20_populated,
  COUNT(CASE WHEN pa.h2h_avg IS NOT NULL THEN 1 END) AS h2h_populated,
  COUNT(CASE WHEN pa.matchup_rank IS NOT NULL THEN 1 END) AS matchup_populated,
  ROUND(COUNT(CASE WHEN pa.l5 IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS l5_pct,
  ROUND(COUNT(CASE WHEN pa.l10 IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS l10_pct,
  ROUND(COUNT(CASE WHEN pa.l20 IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS l20_pct,
  ROUND(COUNT(CASE WHEN pa.h2h_avg IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS h2h_pct,
  ROUND(COUNT(CASE WHEN pa.matchup_rank IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS matchup_pct
FROM public.player_analytics pa
LEFT JOIN LATERAL (
  SELECT l.abbreviation AS league
  FROM public.player_props pp
  JOIN public.prop_types pt ON pt.id = pp.prop_type_id
  JOIN public.games g ON g.id = pp.game_id
  JOIN public.leagues l ON l.id = g.league_id
  WHERE pp.player_id = pa.player_id
    AND pt.name = pa.prop_type
    AND EXTRACT(YEAR FROM g.game_date)::text = pa.season
  ORDER BY g.game_date DESC
  LIMIT 1
) lg ON TRUE
GROUP BY lg.league
ORDER BY lg.league;

SELECT 
  l.abbreviation AS league,
  COUNT(*) AS recent_props,
  COUNT(DISTINCT pp.player_id) AS recent_players,
  MIN(pp.created_at) AS earliest_recent,
  MAX(pp.created_at) AS latest_recent
FROM public.player_props pp
JOIN public.games g ON g.id = pp.game_id
JOIN public.leagues l ON l.id = g.league_id
WHERE pp.created_at >= NOW() - INTERVAL '7 days'
GROUP BY l.abbreviation
ORDER BY l.abbreviation;

SELECT 
  lg.league,
  pa.prop_type,
  COUNT(*) AS total_records,
  AVG(pa.l10) AS avg_l10_hit_rate,
  COUNT(CASE WHEN pa.l10 > 0 THEN 1 END) AS records_with_l10_data,
  ROUND(COUNT(CASE WHEN pa.l10 > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS l10_coverage_pct
FROM public.player_analytics pa
LEFT JOIN LATERAL (
  SELECT l.abbreviation AS league
  FROM public.player_props pp
  JOIN public.prop_types pt ON pt.id = pp.prop_type_id
  JOIN public.games g ON g.id = pp.game_id
  JOIN public.leagues l ON l.id = g.league_id
  WHERE pp.player_id = pa.player_id
    AND pt.name = pa.prop_type
    AND EXTRACT(YEAR FROM g.game_date)::text = pa.season
  ORDER BY g.game_date DESC
  LIMIT 1
) lg ON TRUE
GROUP BY lg.league, pa.prop_type
HAVING COUNT(*) > 0
ORDER BY lg.league, pa.prop_type;

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

SELECT 
  p.full_name AS player_name,
  lg.league,
  pa.prop_type,
  pa.l5 AS hit_rate_l5_pct,
  pa.l10 AS hit_rate_l10_pct,
  pa.l20 AS hit_rate_l20_pct,
  pa.h2h_avg,
  pa.matchup_rank,
  pa.ev_percent,
  pa.season
FROM public.player_analytics pa
JOIN public.players p ON p.id = pa.player_id
LEFT JOIN LATERAL (
  SELECT l.abbreviation AS league
  FROM public.player_props pp
  JOIN public.prop_types pt ON pt.id = pp.prop_type_id
  JOIN public.games g ON g.id = pp.game_id
  JOIN public.leagues l ON l.id = g.league_id
  WHERE pp.player_id = pa.player_id
    AND pt.name = pa.prop_type
    AND EXTRACT(YEAR FROM g.game_date)::text = pa.season
  ORDER BY g.game_date DESC
  LIMIT 1
) lg ON TRUE
WHERE lg.league IN ('NFL', 'NBA', 'MLB', 'NHL')
  AND pa.l10 IS NOT NULL
  AND pa.l10 > 0
ORDER BY RANDOM()
LIMIT 20;

SELECT 
  'player_props' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM public.player_props
UNION ALL
SELECT 
  'player_game_logs' as table_name,
  COUNT(*) as total_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM public.player_game_logs
UNION ALL
SELECT 
  'player_analytics' as table_name,
  COUNT(*) as total_records,
  MIN(last_updated) as earliest_record,
  MAX(last_updated) as latest_record,
  COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h,
  COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM public.player_analytics;

SELECT 
  'SUMMARY' as metric,
  (SELECT COUNT(*) FROM public.player_props) as total_props,
  (SELECT COUNT(*) FROM public.player_game_logs) as total_game_logs,
  (SELECT COUNT(*) FROM public.player_analytics) as total_analytics,
  (SELECT COALESCE((SELECT COUNT(*) FROM public.missing_players), 0)) as missing_players,
  (SELECT COUNT(DISTINCT l.abbreviation) FROM public.player_props pp JOIN public.games g ON g.id = pp.game_id JOIN public.leagues l ON l.id = g.league_id) as leagues_with_data,
  (SELECT COUNT(DISTINCT EXTRACT(YEAR FROM g.game_date)) FROM public.player_props pp JOIN public.games g ON g.id = pp.game_id) as seasons_with_data,
  (SELECT COUNT(DISTINCT pp.player_id) FROM public.player_props pp) as unique_players,
  (SELECT COUNT(DISTINCT pp.prop_type_id) FROM public.player_props pp) as unique_prop_types;
