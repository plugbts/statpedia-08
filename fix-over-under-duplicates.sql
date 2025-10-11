-- Fix over/under props by removing duplicates instead of renaming
-- This script removes over/under props that would conflict with existing properly named props

-- First, let's see what we're dealing with
SELECT 
    league,
    COUNT(*) as total_over_under,
    COUNT(DISTINCT player_id) as unique_players
FROM proplines 
WHERE prop_type = 'over/under'
GROUP BY league
ORDER BY total_over_under DESC;

-- Remove NFL over/under props that would conflict with existing properly named props
-- We'll delete the over/under props and keep the properly named ones
DELETE FROM proplines 
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type IN (
        'passing_yards', 'rushing_yards', 'receiving_yards', 
        'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns',
        'passing_completions', 'passing_attempts', 'passing_interceptions',
        'receptions', 'rushing_attempts'
      )
  );

-- Remove MLB over/under props that would conflict with existing properly named props
DELETE FROM proplines 
WHERE prop_type = 'over/under' 
  AND league = 'mlb'
  AND EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type IN (
        'hits', 'home_runs', 'runs_batted_in', 'runs', 
        'strikeouts', 'walks', 'stolen_bases', 'singles', 'doubles', 'triples'
      )
  );

-- Now update the remaining over/under props that don't conflict
-- NFL mappings for remaining props
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

-- MLB mappings for remaining props
UPDATE proplines 
SET prop_type = CASE 
    -- Low line values (0.5-2) = Hits
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 2 THEN 'hits'
    
    -- Very low line values (0.5-1) = Home Runs
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 1 THEN 'home_runs'
    
    -- Medium-low line values (0.5-3) = Strikeouts or RBIs
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 3 THEN 'strikeouts'
    
    -- Medium line values (0.5-2) = Runs
    WHEN prop_type = 'over/under' AND league = 'mlb' AND line >= 0.5 AND line <= 2 THEN 'runs'
    
    -- Keep other leagues as-is
    ELSE prop_type
END
WHERE prop_type = 'over/under' AND league = 'mlb';

-- Verify the changes
SELECT 
    league,
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE league IN ('nfl', 'mlb')
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
WHERE league IN ('nfl', 'mlb')
  AND prop_type IN ('passing_yards', 'rushing_yards', 'rushing_attempts', 'receptions', 'passing_touchdowns', 'hits', 'home_runs', 'strikeouts', 'runs')
ORDER BY league, line DESC
LIMIT 20;
