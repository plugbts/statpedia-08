-- Basic diagnostics to ensure enrichment can populate analytics

-- 1) Missing key IDs in logs that block enrichment
SELECT 
  COUNT(*) FILTER (WHERE player_id IS NULL) AS missing_player_id,
  COUNT(*) FILTER (WHERE team_id IS NULL) AS missing_team_id,
  COUNT(*) FILTER (WHERE opponent_team_id IS NULL) AS missing_opponent_team_id
FROM public.player_game_logs;

-- 2) Games missing team links (affects matchup rank)
SELECT 
  COUNT(*) FILTER (WHERE home_team_id IS NULL) AS games_missing_home,
  COUNT(*) FILTER (WHERE away_team_id IS NULL) AS games_missing_away
FROM public.games;

-- 3) Props without corresponding logs (affects EV%)
SELECT COUNT(*) AS props_without_logs
FROM public.player_props p
LEFT JOIN public.player_game_logs l
  ON l.player_id = p.player_id
 AND l.prop_type = (SELECT name FROM public.prop_types WHERE id = p.prop_type_id)
WHERE l.player_id IS NULL;

-- 4) Analytics coverage snapshot
SELECT 
  COUNT(*) AS total_analytics,
  COUNT(*) FILTER (WHERE l5 IS NOT NULL) AS with_l5,
  COUNT(*) FILTER (WHERE l10 IS NOT NULL) AS with_l10,
  COUNT(*) FILTER (WHERE l20 IS NOT NULL) AS with_l20,
  COUNT(*) FILTER (WHERE current_streak IS NOT NULL) AS with_streak,
  COUNT(*) FILTER (WHERE h2h_avg IS NOT NULL) AS with_h2h,
  COUNT(*) FILTER (WHERE ev_percent IS NOT NULL) AS with_ev
FROM public.player_analytics;
