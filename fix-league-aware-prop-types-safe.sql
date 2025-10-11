-- League-aware prop type fix for all leagues (NFL, NBA, NHL, MLB, etc.)
-- This script fixes over/under props by mapping them to proper prop types based on league and line ranges
-- SAFE VERSION - handles conflicts gracefully

-- First, let's populate the prop_type_aliases table with comprehensive mappings for ALL leagues
-- Use ON CONFLICT to handle duplicates gracefully
INSERT INTO prop_type_aliases (alias, canonical) VALUES
-- NFL comprehensive mappings
('passing_yards', 'passing_yards'),
('pass_yards', 'passing_yards'),
('pass yards', 'passing_yards'),
('passing_yds', 'passing_yards'),
('pass_yds', 'passing_yards'),
('passing_touchdowns', 'passing_touchdowns'),
('passing_tds', 'passing_touchdowns'),
('pass_tds', 'passing_touchdowns'),
('passing_attempts', 'passing_attempts'),
('pass_attempts', 'passing_attempts'),
('passing_completions', 'passing_completions'),
('pass_completions', 'passing_completions'),
('passing_interceptions', 'passing_interceptions'),
('passing_ints', 'passing_interceptions'),
('pass_interceptions', 'passing_interceptions'),
('rushing_yards', 'rushing_yards'),
('rush_yards', 'rushing_yards'),
('rush yards', 'rushing_yards'),
('rushing_yds', 'rushing_yards'),
('rush_yds', 'rushing_yards'),
('rushing_touchdowns', 'rushing_touchdowns'),
('rushing_tds', 'rushing_touchdowns'),
('rush_touchdowns', 'rushing_touchdowns'),
('rush_tds', 'rushing_touchdowns'),
('rushing_attempts', 'rushing_attempts'),
('rush_attempts', 'rushing_attempts'),
('carries', 'rushing_attempts'),
('receiving_yards', 'receiving_yards'),
('rec_yards', 'receiving_yards'),
('receiving_yds', 'receiving_yards'),
('rec_yds', 'receiving_yards'),
('receiving_touchdowns', 'receiving_touchdowns'),
('receiving_tds', 'receiving_touchdowns'),
('rec_touchdowns', 'receiving_touchdowns'),
('rec_tds', 'receiving_touchdowns'),
('receiving_receptions', 'receiving_receptions'),
('receptions', 'receiving_receptions'),
('rec_receptions', 'receiving_receptions'),
('catches', 'receiving_receptions'),
('defense_sacks', 'defense_sacks'),
('sacks', 'defense_sacks'),
('defense_interceptions', 'defense_interceptions'),
('defense_ints', 'defense_interceptions'),
('def_interceptions', 'defense_interceptions'),
('defense_combined_tackles', 'defense_combined_tackles'),
('defense_tackles', 'defense_combined_tackles'),
('combined_tackles', 'defense_combined_tackles'),
('total_tackles', 'defense_combined_tackles'),
('field_goals_made', 'field_goals_made'),
('fg_made', 'field_goals_made'),
('kicking_total_points', 'kicking_total_points'),
('kicker_points', 'kicking_total_points'),
('extra_points_kicks_made', 'extra_points_kicks_made'),
('xp_made', 'extra_points_kicks_made'),

-- NBA comprehensive mappings
('points', 'points'),
('pts', 'points'),
('rebounds', 'rebounds'),
('reb', 'rebounds'),
('assists', 'assists'),
('ast', 'assists'),
('steals', 'steals'),
('stl', 'steals'),
('blocks', 'blocks'),
('blk', 'blocks'),
('field_goals_made', 'field_goals_made'),
('fgm', 'field_goals_made'),
('field_goals_attempted', 'field_goals_attempted'),
('fga', 'field_goals_attempted'),
('three_pointers_made', 'three_pointers_made'),
('3pm', 'three_pointers_made'),
('3pt_made', 'three_pointers_made'),
('three_pointers_attempted', 'three_pointers_attempted'),
('3pa', 'three_pointers_attempted'),
('3pt_attempted', 'three_pointers_attempted'),
('free_throws_made', 'free_throws_made'),
('ftm', 'free_throws_made'),
('free_throws_attempted', 'free_throws_attempted'),
('fta', 'free_throws_attempted'),
('turnovers', 'turnovers'),
('to', 'turnovers'),

-- NHL comprehensive mappings
('goals', 'goals'),
('assists', 'assists'),
('points', 'points'),
('shots_on_goal', 'shots_on_goal'),
('sog', 'shots_on_goal'),
('shots', 'shots_on_goal'),
('goalie_saves', 'goalie_saves'),
('saves', 'goalie_saves'),
('blocks', 'blocks'),
('hits', 'hits'),
('penalty_minutes', 'penalty_minutes'),
('pims', 'penalty_minutes'),

-- MLB comprehensive mappings
('hits', 'hits'),
('home_runs', 'home_runs'),
('hr', 'home_runs'),
('runs_batted_in', 'runs_batted_in'),
('rbi', 'runs_batted_in'),
('runs', 'runs'),
('stolen_bases', 'stolen_bases'),
('sb', 'stolen_bases'),
('walks', 'walks'),
('batting_basesonballs', 'walks'),
('batting_basesOnBalls', 'walks'),
('strikeouts', 'strikeouts'),
('batting_strikeouts', 'strikeouts'),
('so', 'strikeouts'),

-- Generic mappings for common variations
('over', 'over_under'),
('under', 'over_under'),
('over/under', 'over_under'),
('o/u', 'over_under'),
('total', 'over_under')
ON CONFLICT (alias) DO NOTHING;

-- Now fix the over/under props based on league-aware line range analysis
-- This will only update existing over/under props, not create new ones
UPDATE proplines 
SET prop_type = CASE 
    -- NFL mappings
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 200 THEN 'passing_yards'
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 50 AND line <= 200 THEN 'rushing_yards'
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 15 AND line <= 50 THEN 'rushing_attempts'
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 5 AND line <= 15 THEN 'receptions'
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 1 AND line <= 5 THEN 'passing_touchdowns'
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 0.5 AND line <= 1 THEN 'passing_touchdowns'
    
    -- NBA mappings
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 15 AND line <= 50 THEN 'points'
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 8 AND line <= 20 THEN 'rebounds'
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 5 AND line <= 15 THEN 'assists'
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 1 AND line <= 5 THEN 'steals'
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 1 AND line <= 5 THEN 'blocks'
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 1 AND line <= 8 THEN 'three_pointers_made'
    WHEN prop_type = 'over/under' AND league = 'nba' AND line >= 5 AND line <= 15 THEN 'field_goals_made'
    
    -- NHL mappings
    WHEN prop_type = 'over/under' AND league = 'nhl' AND line >= 0.5 AND line <= 3 THEN 'goals'
    WHEN prop_type = 'over/under' AND league = 'nhl' AND line >= 0.5 AND line <= 3 THEN 'assists'
    WHEN prop_type = 'over/under' AND league = 'nhl' AND line >= 1 AND line <= 5 THEN 'points'
    WHEN prop_type = 'over/under' AND league = 'nhl' AND line >= 1 AND line <= 8 THEN 'shots_on_goal'
    WHEN prop_type = 'over/under' AND league = 'nhl' AND line >= 20 AND line <= 50 THEN 'goalie_saves'
    
    -- MLB mappings
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 2 THEN 'hits'
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 1 THEN 'home_runs'
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 3 THEN 'runs_batted_in'
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 2 THEN 'runs'
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 2 THEN 'stolen_bases'
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 3 THEN 'walks'
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 3 THEN 'strikeouts'
    
    -- College Football mappings (similar to NFL but different line ranges)
    WHEN prop_type = 'over/under' AND league = 'college_football' AND line >= 150 AND line <= 400 THEN 'passing_yards'
    WHEN prop_type = 'over/under' AND league = 'college_football' AND line >= 30 AND line <= 150 THEN 'rushing_yards'
    WHEN prop_type = 'over/under' AND league = 'college_football' AND line >= 30 AND line <= 120 THEN 'receiving_yards'
    WHEN prop_type = 'over/under' AND league = 'college_football' AND line >= 10 AND line <= 30 THEN 'rushing_attempts'
    WHEN prop_type = 'over/under' AND league = 'college_football' AND line >= 3 AND line <= 12 THEN 'receptions'
    WHEN prop_type = 'over/under' AND league = 'college_football' AND line >= 0.5 AND line <= 3 THEN 'passing_touchdowns'
    
    -- College Basketball mappings (similar to NBA but different line ranges)
    WHEN prop_type = 'over/under' AND league = 'college_basketball' AND line >= 10 AND line <= 35 THEN 'points'
    WHEN prop_type = 'over/under' AND league = 'college_basketball' AND line >= 6 AND line <= 15 THEN 'rebounds'
    WHEN prop_type = 'over/under' AND league = 'college_basketball' AND line >= 3 AND line <= 10 THEN 'assists'
    WHEN prop_type = 'over/under' AND league = 'college_basketball' AND line >= 0.5 AND line <= 3 THEN 'steals'
    WHEN prop_type = 'over/under' AND league = 'college_basketball' AND line >= 0.5 AND line <= 3 THEN 'blocks'
    
    -- Keep other leagues as-is for now
    ELSE prop_type
END
WHERE prop_type = 'over/under';

-- Verify the changes by league
SELECT 
    league,
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE prop_type != 'over/under'
GROUP BY league, prop_type
ORDER BY league, count DESC;

-- Show remaining over/under props by league
SELECT 
    league,
    COUNT(*) as remaining_over_under,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE prop_type = 'over/under'
GROUP BY league
ORDER BY remaining_over_under DESC;

-- Show total aliases count
SELECT COUNT(*) as total_aliases FROM prop_type_aliases;

-- Show sample of fixed props by league
SELECT 
    league,
    player_name,
    prop_type,
    line,
    team,
    opponent,
    date
FROM proplines 
WHERE prop_type IN ('passing_yards', 'rushing_yards', 'rushing_attempts', 'receptions', 'passing_touchdowns', 'points', 'rebounds', 'assists', 'goals', 'assists', 'hits', 'home_runs')
ORDER BY league, line DESC
LIMIT 20;
