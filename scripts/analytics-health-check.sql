-- Analytics Health Check: Player/Team/Prop Linkage and Coverage

-- 1. Missing player_id/team_id/opponent_team_id in logs
SELECT 
  COUNT(*) FILTER (WHERE player_id IS NULL) AS missing_players,
  COUNT(*) FILTER (WHERE team_id IS NULL) AS missing_teams,
  COUNT(*) FILTER (WHERE opponent_team_id IS NULL) AS missing_opponents
FROM player_game_logs;

-- 2. Props not linked to logs
SELECT COUNT(*) AS props_without_logs
FROM player_props p
LEFT JOIN player_game_logs l ON p.player_id = l.player_id AND p.prop_type = l.prop_type AND EXTRACT(YEAR FROM l.game_date)::text = p.season
WHERE l.id IS NULL;

-- 3. Analytics coverage (EV%, streaks, matchup_rank, L5/L10/L20)
SELECT 
  COUNT(*) AS total_analytics,
  COUNT(*) FILTER (WHERE l5 IS NOT NULL) AS with_l5,
  COUNT(*) FILTER (WHERE l10 IS NOT NULL) AS with_l10,
  COUNT(*) FILTER (WHERE l20 IS NOT NULL) AS with_l20,
  COUNT(*) FILTER (WHERE current_streak IS NOT NULL) AS with_streak,
  COUNT(*) FILTER (WHERE matchup_rank IS NOT NULL) AS with_matchup_rank,
  COUNT(*) FILTER (WHERE ev_percent IS NOT NULL) AS with_ev
FROM player_analytics;

-- 4. Team/abbrev mapping health
SELECT COUNT(*) AS teams_mlb FROM teams WHERE league = 'MLB';
SELECT COUNT(*) AS teams_nba FROM teams WHERE league = 'NBA';
SELECT COUNT(*) AS teams_nfl FROM teams WHERE league = 'NFL';
SELECT COUNT(*) AS teams_wnba FROM teams WHERE league = 'WNBA';
SELECT COUNT(*) AS abbrev_mlb FROM team_abbrev_map WHERE league = 'MLB';
SELECT COUNT(*) AS abbrev_nba FROM team_abbrev_map WHERE league = 'NBA';
SELECT COUNT(*) AS abbrev_nfl FROM team_abbrev_map WHERE league = 'NFL';
SELECT COUNT(*) AS abbrev_wnba FROM team_abbrev_map WHERE league = 'WNBA';
