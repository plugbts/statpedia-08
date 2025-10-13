-- Sample Data Population for Analytics System
-- This script populates player_game_logs and defense_ranks with realistic sample data

-- 1. Populate player_game_logs with sample historical data
-- Get some existing props to use as base data
INSERT INTO player_game_logs (
  player_id, team_id, game_id, opponent_id, prop_type, line, actual_value, hit, game_date, season, home_away
)
SELECT 
  p.player_id,
  p.team_id,
  p.game_id,
  CASE 
    WHEN p.team_id = g.home_team_id THEN g.away_team_id 
    ELSE g.home_team_id 
  END as opponent_id,
  p.prop_type,
  p.line,
  -- Generate realistic actual values based on line
  CASE 
    WHEN p.prop_type ILIKE '%yards%' THEN 
      p.line + (RANDOM() - 0.5) * 20 -- Yards: ±10 from line
    WHEN p.prop_type ILIKE '%receptions%' OR p.prop_type ILIKE '%catches%' THEN
      p.line + (RANDOM() - 0.5) * 3 -- Receptions: ±1.5 from line
    WHEN p.prop_type ILIKE '%points%' THEN
      p.line + (RANDOM() - 0.5) * 2 -- Points: ±1 from line
    WHEN p.prop_type ILIKE '%assists%' THEN
      p.line + (RANDOM() - 0.5) * 2 -- Assists: ±1 from line
    WHEN p.prop_type ILIKE '%rebounds%' THEN
      p.line + (RANDOM() - 0.5) * 3 -- Rebounds: ±1.5 from line
    ELSE p.line + (RANDOM() - 0.5) * 2 -- Default: ±1 from line
  END as actual_value,
  -- Determine if hit based on actual value vs line
  CASE 
    WHEN p.prop_type ILIKE '%yards%' THEN 
      (p.line + (RANDOM() - 0.5) * 20) >= p.line
    WHEN p.prop_type ILIKE '%receptions%' OR p.prop_type ILIKE '%catches%' THEN
      (p.line + (RANDOM() - 0.5) * 3) >= p.line
    WHEN p.prop_type ILIKE '%points%' THEN
      (p.line + (RANDOM() - 0.5) * 2) >= p.line
    WHEN p.prop_type ILIKE '%assists%' THEN
      (p.line + (RANDOM() - 0.5) * 2) >= p.line
    WHEN p.prop_type ILIKE '%rebounds%' THEN
      (p.line + (RANDOM() - 0.5) * 3) >= p.line
    ELSE (p.line + (RANDOM() - 0.5) * 2) >= p.line
  END as hit,
  -- Generate historical dates (past 30 days)
  g.game_date - INTERVAL '1 day' * (RANDOM() * 30)::INT as game_date,
  g.season,
  CASE WHEN p.team_id = g.home_team_id THEN 'home' ELSE 'away' END as home_away
FROM props p
JOIN games g ON p.game_id = g.id
WHERE p.id IN (
  SELECT id FROM props 
  WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Receptions', 'Points', 'Assists', 'Rebounds')
  LIMIT 100 -- Limit to avoid too much data
);

-- Generate multiple historical games for the same players/props (simulate L5, L10, L20)
INSERT INTO player_game_logs (
  player_id, team_id, game_id, opponent_id, prop_type, line, actual_value, hit, game_date, season, home_away
)
SELECT 
  p.player_id,
  p.team_id,
  gen_random_uuid() as game_id, -- Generate fake game IDs for historical data
  CASE 
    WHEN p.team_id = g.home_team_id THEN g.away_team_id 
    ELSE g.home_team_id 
  END as opponent_id,
  p.prop_type,
  p.line,
  -- Generate realistic actual values
  CASE 
    WHEN p.prop_type ILIKE '%yards%' THEN 
      p.line + (RANDOM() - 0.5) * 20
    WHEN p.prop_type ILIKE '%receptions%' OR p.prop_type ILIKE '%catches%' THEN
      p.line + (RANDOM() - 0.5) * 3
    WHEN p.prop_type ILIKE '%points%' THEN
      p.line + (RANDOM() - 0.5) * 2
    WHEN p.prop_type ILIKE '%assists%' THEN
      p.line + (RANDOM() - 0.5) * 2
    WHEN p.prop_type ILIKE '%rebounds%' THEN
      p.line + (RANDOM() - 0.5) * 3
    ELSE p.line + (RANDOM() - 0.5) * 2
  END as actual_value,
  -- Determine if hit
  CASE 
    WHEN p.prop_type ILIKE '%yards%' THEN 
      (p.line + (RANDOM() - 0.5) * 20) >= p.line
    WHEN p.prop_type ILIKE '%receptions%' OR p.prop_type ILIKE '%catches%' THEN
      (p.line + (RANDOM() - 0.5) * 3) >= p.line
    WHEN p.prop_type ILIKE '%points%' THEN
      (p.line + (RANDOM() - 0.5) * 2) >= p.line
    WHEN p.prop_type ILIKE '%assists%' THEN
      (p.line + (RANDOM() - 0.5) * 2) >= p.line
    WHEN p.prop_type ILIKE '%rebounds%' THEN
      (p.line + (RANDOM() - 0.5) * 3) >= p.line
    ELSE (p.line + (RANDOM() - 0.5) * 2) >= p.line
  END as hit,
  -- Generate more historical dates (2-60 days ago)
  g.game_date - INTERVAL '1 day' * (2 + RANDOM() * 58)::INT as game_date,
  g.season,
  CASE WHEN p.team_id = g.home_team_id THEN 'home' ELSE 'away' END as home_away
FROM props p
JOIN games g ON p.game_id = g.id
WHERE p.id IN (
  SELECT id FROM props 
  WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Receptions', 'Points', 'Assists', 'Rebounds')
  LIMIT 50 -- Limit for performance
);

-- 2. Populate defense_ranks with sample defensive rankings
INSERT INTO defense_ranks (team_id, league_id, prop_type, rank, rank_percentile, season, games_tracked)
SELECT DISTINCT
  t.id as team_id,
  t.league_id,
  p.prop_type,
  -- Generate realistic defensive ranks (1-32 for NFL, 1-30 for NBA, etc.)
  CASE 
    WHEN l.code = 'NFL' THEN (1 + RANDOM() * 31)::INT
    WHEN l.code = 'NBA' THEN (1 + RANDOM() * 29)::INT
    WHEN l.code = 'MLB' THEN (1 + RANDOM() * 29)::INT
    WHEN l.code = 'NHL' THEN (1 + RANDOM() * 31)::INT
    ELSE (1 + RANDOM() * 15)::INT
  END as rank,
  -- Calculate percentile from rank
  CASE 
    WHEN l.code = 'NFL' THEN ((32 - (1 + RANDOM() * 31)::INT) / 31.0) * 100
    WHEN l.code = 'NBA' THEN ((30 - (1 + RANDOM() * 29)::INT) / 29.0) * 100
    WHEN l.code = 'MLB' THEN ((30 - (1 + RANDOM() * 29)::INT) / 29.0) * 100
    WHEN l.code = 'NHL' THEN ((32 - (1 + RANDOM() * 31)::INT) / 31.0) * 100
    ELSE ((16 - (1 + RANDOM() * 15)::INT) / 15.0) * 100
  END as rank_percentile,
  '2025' as season,
  (10 + RANDOM() * 15)::INT as games_tracked -- 10-25 games tracked
FROM teams t
JOIN leagues l ON t.league_id = l.id
CROSS JOIN (
  SELECT DISTINCT prop_type FROM props 
  WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Receptions', 'Points', 'Assists', 'Rebounds')
) p
WHERE t.id IN (
  SELECT DISTINCT team_id FROM props LIMIT 20
);

-- 3. Update props with analytics using the functions
-- Update a sample of props to demonstrate the analytics
UPDATE props SET
  hit_rate_l5 = CASE WHEN RANDOM() < 0.3 THEN 60 + RANDOM() * 30 ELSE NULL END,
  hit_rate_l10 = CASE WHEN RANDOM() < 0.4 THEN 55 + RANDOM() * 35 ELSE NULL END,
  hit_rate_l20 = CASE WHEN RANDOM() < 0.5 THEN 50 + RANDOM() * 40 ELSE NULL END,
  streak_current = CASE 
    WHEN RANDOM() < 0.2 THEN (1 + RANDOM() * 4)::INT -- Hot streak
    WHEN RANDOM() < 0.4 THEN (-1 - RANDOM() * 4)::INT -- Cold streak
    ELSE 0 -- Neutral
  END,
  h2h_hit_rate = CASE WHEN RANDOM() < 0.3 THEN 40 + RANDOM() * 50 ELSE NULL END,
  matchup_rank = CASE WHEN RANDOM() < 0.5 THEN (1 + RANDOM() * 31)::INT ELSE NULL END,
  matchup_grade = CASE WHEN RANDOM() < 0.5 THEN 30 + RANDOM() * 50 ELSE NULL END,
  historical_average = line + (RANDOM() - 0.5) * (line * 0.3), -- ±15% of line
  games_tracked = (5 + RANDOM() * 20)::INT
WHERE id IN (
  SELECT id FROM props 
  WHERE prop_type IN ('Passing Yards', 'Rushing Yards', 'Receiving Yards', 'Receptions', 'Points', 'Assists', 'Rebounds')
  LIMIT 100
);

-- 4. Validation queries
SELECT 
  'player_game_logs' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_prop_types
FROM player_game_logs

UNION ALL

SELECT 
  'defense_ranks' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT team_id) as unique_teams,
  COUNT(DISTINCT prop_type) as unique_prop_types
FROM defense_ranks

UNION ALL

SELECT 
  'props_with_analytics' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT prop_type) as unique_prop_types
FROM props
WHERE hit_rate_l5 IS NOT NULL OR hit_rate_l10 IS NOT NULL OR streak_current IS NOT NULL;
