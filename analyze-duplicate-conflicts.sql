-- Analyze duplicate conflicts before fixing over/under props
-- This script identifies which over/under props would conflict with existing properly named props

-- 1. Check current over/under props
SELECT 
    league,
    COUNT(*) as total_over_under,
    COUNT(DISTINCT player_id) as unique_players
FROM proplines 
WHERE prop_type = 'over/under'
GROUP BY league
ORDER BY total_over_under DESC;

-- 2. Find NFL over/under props that would conflict with existing properly named props
SELECT 
    'NFL Conflicts' as analysis_type,
    COUNT(*) as conflicting_props
FROM proplines p1
WHERE p1.prop_type = 'over/under' 
  AND p1.league = 'nfl'
  AND EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = p1.player_id 
      AND p2.date = p1.date 
      AND p2.sportsbook = p1.sportsbook
      AND p2.prop_type IN (
        'passing_yards', 'rushing_yards', 'receiving_yards', 
        'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns',
        'passing_completions', 'passing_attempts', 'passing_interceptions',
        'receptions', 'rushing_attempts'
      )
  );

-- 3. Show specific NFL conflicts
SELECT 
    p1.player_name,
    p1.prop_type as over_under_prop,
    p1.line as over_under_line,
    p2.prop_type as existing_prop,
    p2.line as existing_line,
    p1.sportsbook,
    p1.date
FROM proplines p1
JOIN proplines p2 ON (
    p2.player_id = p1.player_id 
    AND p2.date = p1.date 
    AND p2.sportsbook = p1.sportsbook
)
WHERE p1.prop_type = 'over/under' 
  AND p1.league = 'nfl'
  AND p2.prop_type IN (
    'passing_yards', 'rushing_yards', 'receiving_yards', 
    'passing_touchdowns', 'rushing_touchdowns', 'receiving_touchdowns',
    'passing_completions', 'passing_attempts', 'passing_interceptions',
    'receptions', 'rushing_attempts'
  )
ORDER BY p1.player_name, p1.date
LIMIT 10;

-- 4. Find MLB over/under props that would conflict
SELECT 
    'MLB Conflicts' as analysis_type,
    COUNT(*) as conflicting_props
FROM proplines p1
WHERE p1.prop_type = 'over/under' 
  AND p1.league = 'mlb'
  AND EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = p1.player_id 
      AND p2.date = p1.date 
      AND p2.sportsbook = p1.sportsbook
      AND p2.prop_type IN (
        'hits', 'home_runs', 'runs_batted_in', 'runs', 
        'strikeouts', 'walks', 'stolen_bases', 'singles', 'doubles', 'triples'
      )
  );

-- 5. Show specific MLB conflicts
SELECT 
    p1.player_name,
    p1.prop_type as over_under_prop,
    p1.line as over_under_line,
    p2.prop_type as existing_prop,
    p2.line as existing_line,
    p1.sportsbook,
    p1.date
FROM proplines p1
JOIN proplines p2 ON (
    p2.player_id = p1.player_id 
    AND p2.date = p1.date 
    AND p2.sportsbook = p1.sportsbook
)
WHERE p1.prop_type = 'over/under' 
  AND p1.league = 'mlb'
  AND p2.prop_type IN (
    'hits', 'home_runs', 'runs_batted_in', 'runs', 
    'strikeouts', 'walks', 'stolen_bases', 'singles', 'doubles', 'triples'
  )
ORDER BY p1.player_name, p1.date
LIMIT 10;

-- 6. Count non-conflicting over/under props that can be safely updated
SELECT 
    league,
    COUNT(*) as safe_to_update
FROM proplines p1
WHERE p1.prop_type = 'over/under'
  AND NOT EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = p1.player_id 
      AND p2.date = p1.date 
      AND p2.sportsbook = p1.sportsbook
      AND p2.prop_type != 'over/under'
  )
GROUP BY league
ORDER BY safe_to_update DESC;
