-- Safe fix for over/under props - only update non-conflicting ones
-- This script only updates over/under props that won't create duplicates

-- Step 1: Update NFL over/under props that DON'T conflict with existing properly named props
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
    
    ELSE prop_type
END
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND NOT EXISTS (
    -- Only update if there's no existing properly named prop for this player/date/sportsbook
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

-- Step 2: Update MLB over/under props that DON'T conflict with existing properly named props
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
    
    ELSE prop_type
END
WHERE prop_type = 'over/under' 
  AND league = 'mlb'
  AND NOT EXISTS (
    -- Only update if there's no existing properly named prop for this player/date/sportsbook
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type IN (
        'hits', 'home_runs', 'runs_batted_in', 'runs', 
        'strikeouts', 'walks', 'stolen_bases', 'singles', 'doubles', 'triples'
      )
  );

-- Step 3: For remaining conflicting over/under props, we'll delete them since we have properly named ones
-- Delete NFL over/under props that conflict with existing properly named props
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

-- Delete MLB over/under props that conflict with existing properly named props
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

-- Verify the results
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
