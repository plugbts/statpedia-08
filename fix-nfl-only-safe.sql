-- NFL-only prop type fix (SAFE VERSION)
-- This script fixes the 124 NFL over/under props by mapping them to proper prop types

-- First, add essential prop type aliases (only if they don't exist)
INSERT INTO prop_type_aliases (alias, canonical) VALUES
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
('xp_made', 'extra_points_kicks_made')
ON CONFLICT (alias) DO NOTHING;

-- Now fix the NFL over/under props based on line range analysis
UPDATE proplines 
SET prop_type = CASE 
    -- High line values (200+) = Passing Yards
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 200 THEN 'passing_yards'
    
    -- Medium-high line values (50-200) = Rushing Yards or Receiving Yards
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 50 AND line <= 200 THEN 'rushing_yards'
    
    -- Medium line values (15-50) = Rushing Attempts
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 15 AND line <= 50 THEN 'rushing_attempts'
    
    -- Medium-low line values (5-15) = Receptions
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 5 AND line <= 15 THEN 'receptions'
    
    -- Low line values (1-5) = Touchdowns
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 1 AND line <= 5 THEN 'passing_touchdowns'
    
    -- Very low line values (0.5-1) = Touchdowns or other low-value props
    WHEN prop_type = 'over/under' AND league = 'nfl' AND line >= 0.5 AND line <= 1 THEN 'passing_touchdowns'
    
    -- Keep other leagues as-is
    ELSE prop_type
END
WHERE prop_type = 'over/under' AND league = 'nfl';

-- Verify the NFL changes
SELECT 
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE league = 'nfl'
GROUP BY prop_type
ORDER BY count DESC;

-- Show remaining over/under props (should be 0 for NFL now)
SELECT 
    league,
    COUNT(*) as remaining_over_under
FROM proplines 
WHERE prop_type = 'over/under'
GROUP BY league
ORDER BY remaining_over_under DESC;

-- Show sample of fixed NFL props
SELECT 
    player_name,
    prop_type,
    line,
    team,
    opponent,
    date
FROM proplines 
WHERE league = 'nfl' 
  AND prop_type IN ('passing_yards', 'rushing_yards', 'rushing_attempts', 'receptions', 'passing_touchdowns')
ORDER BY line DESC
LIMIT 10;
