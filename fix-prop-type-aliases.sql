-- Fix prop type aliases to resolve over/under issue
-- This script populates the prop_type_aliases table with comprehensive mappings

-- First, let's clear any existing problematic mappings
DELETE FROM prop_type_aliases WHERE canonical = 'over/under' OR alias = 'over/under';

-- Insert comprehensive NFL prop type mappings
INSERT INTO prop_type_aliases (alias, canonical) VALUES
-- NFL Passing Props
('passing_yards', 'passing_yards'),
('pass_yards', 'passing_yards'),
('pass yards', 'passing_yards'),
('passing yardage', 'passing_yards'),
('passing_yds', 'passing_yards'),
('pass_yds', 'passing_yards'),
('passing_touchdowns', 'passing_touchdowns'),
('passing_tds', 'passing_touchdowns'),
('pass_tds', 'passing_touchdowns'),
('pass touchdowns', 'passing_touchdowns'),
('passing_attempts', 'passing_attempts'),
('pass_attempts', 'passing_attempts'),
('pass attempts', 'passing_attempts'),
('passing_completions', 'passing_completions'),
('pass_completions', 'passing_completions'),
('pass completions', 'passing_completions'),
('passing_interceptions', 'passing_interceptions'),
('passing_ints', 'passing_interceptions'),
('pass_interceptions', 'passing_interceptions'),
('pass ints', 'passing_interceptions'),

-- NFL Rushing Props
('rushing_yards', 'rushing_yards'),
('rush_yards', 'rushing_yards'),
('rush yards', 'rushing_yards'),
('rushing_yds', 'rushing_yards'),
('rush_yds', 'rushing_yards'),
('rushing_touchdowns', 'rushing_touchdowns'),
('rushing_tds', 'rushing_touchdowns'),
('rush_touchdowns', 'rushing_touchdowns'),
('rush_tds', 'rushing_touchdowns'),
('rush touchdowns', 'rushing_touchdowns'),
('rushing_attempts', 'rushing_attempts'),
('rush_attempts', 'rushing_attempts'),
('carries', 'rushing_attempts'),
('rush attempts', 'rushing_attempts'),

-- NFL Receiving Props
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

-- NFL Defense Props
('defense_sacks', 'defense_sacks'),
('sacks', 'defense_sacks'),
('defense_interceptions', 'defense_interceptions'),
('defense_ints', 'defense_interceptions'),
('def_interceptions', 'defense_interceptions'),
('defense_combined_tackles', 'defense_combined_tackles'),
('defense_tackles', 'defense_combined_tackles'),
('combined_tackles', 'defense_combined_tackles'),
('total_tackles', 'defense_combined_tackles'),

-- NFL Kicking Props
('field_goals_made', 'field_goals_made'),
('fg_made', 'field_goals_made'),
('field goals made', 'field_goals_made'),
('kicking_total_points', 'kicking_total_points'),
('kicker_points', 'kicking_total_points'),
('kicking points', 'kicking_total_points'),
('extra_points_kicks_made', 'extra_points_kicks_made'),
('xp_made', 'extra_points_kicks_made'),
('extra points', 'extra_points_kicks_made'),

-- NBA Props
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

-- MLB Props
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

-- NHL Props
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

-- Generic mappings for common variations
('over', 'over_under'),
('under', 'over_under'),
('over/under', 'over_under'),
('o/u', 'over_under'),
('total', 'over_under');

-- Update any existing over/under entries to proper prop types
-- This is a data cleanup step - we'll need to identify what the actual prop types should be
UPDATE proplines 
SET prop_type = CASE 
    WHEN prop_type = 'over/under' AND line BETWEEN 200 AND 400 THEN 'passing_yards'
    WHEN prop_type = 'over/under' AND line BETWEEN 50 AND 150 THEN 'rushing_yards'
    WHEN prop_type = 'over/under' AND line BETWEEN 50 AND 150 AND sport = 'nba' THEN 'points'
    WHEN prop_type = 'over/under' AND line BETWEEN 5 AND 15 THEN 'assists'
    WHEN prop_type = 'over/under' AND line BETWEEN 5 AND 15 AND sport = 'nba' THEN 'rebounds'
    ELSE prop_type
END
WHERE prop_type = 'over/under';

-- Verify the changes
SELECT 
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line,
    sport
FROM proplines 
WHERE prop_type IN ('over/under', 'passing_yards', 'rushing_yards', 'points', 'assists', 'rebounds')
GROUP BY prop_type, sport
ORDER BY count DESC;

-- Show total aliases count
SELECT COUNT(*) as total_aliases FROM prop_type_aliases;
