-- Comprehensive fix for all prop type issues

-- 1. First, let's see what we're working with
SELECT 
    league,
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE league = 'nfl'
GROUP BY league, prop_type
ORDER BY count DESC;

-- 2. Fix the broken prop_type_aliases table
DELETE FROM prop_type_aliases WHERE canonical = 'undefined';

-- 3. Insert proper prop type aliases
INSERT INTO prop_type_aliases (alias, canonical) VALUES
-- Passing props
('passing yards', 'passing_yards'),
('pass yards', 'passing_yards'),
('passing_yds', 'passing_yards'),
('pass_yds', 'passing_yards'),
('passing touchdowns', 'passing_touchdowns'),
('passing tds', 'passing_touchdowns'),
('pass td', 'passing_touchdowns'),
('passing attempts', 'passing_attempts'),
('pass attempts', 'passing_attempts'),
('passing completions', 'passing_completions'),
('pass completions', 'passing_completions'),
('passing interceptions', 'passing_interceptions'),
('pass interceptions', 'passing_interceptions'),
('passing longest completion', 'passing_longestcompletion'),

-- Rushing props
('rushing yards', 'rushing_yards'),
('rush yards', 'rushing_yards'),
('rushing_yds', 'rushing_yards'),
('rush_yds', 'rushing_yards'),
('rushing touchdowns', 'rushing_touchdowns'),
('rushing tds', 'rushing_touchdowns'),
('rush td', 'rushing_touchdowns'),
('rushing attempts', 'rushing_attempts'),
('rush attempts', 'rushing_attempts'),

-- Receiving props
('receiving yards', 'receiving_yards'),
('rec yards', 'receiving_yards'),
('receiving_yds', 'receiving_yards'),
('rec_yds', 'receiving_yards'),
('receiving touchdowns', 'receiving_touchdowns'),
('receiving tds', 'receiving_touchdowns'),
('rec td', 'receiving_touchdowns'),
('receptions', 'receiving_receptions'),
('reception', 'receiving_receptions'),
('catches', 'receiving_receptions'),
('catch', 'receiving_receptions'),

-- Combo props
('passing + rushing yards', 'passing_rushing_yards'),
('pass + rush yards', 'passing_rushing_yards'),
('passing rushing yards', 'passing_rushing_yards'),
('rushing + receiving yards', 'rushing_receiving_yards'),
('rush + rec yards', 'rushing_receiving_yards'),
('rushing receiving yards', 'rushing_receiving_yards'),

-- Other props
('turnovers', 'turnovers'),
('fumbles', 'fumbles'),
('sacks', 'defense_sacks'),
('defense sacks', 'defense_sacks'),
('tackles', 'defense_combined_tackles'),
('defense tackles', 'defense_combined_tackles'),
('interceptions', 'defense_interceptions'),
('defense interceptions', 'defense_interceptions')
ON CONFLICT (alias) DO UPDATE SET canonical = EXCLUDED.canonical;

-- 4. Update existing over/under props based on line ranges
-- This is the same logic as our previous fix but more comprehensive

-- NFL passing yards (high lines: 200+)
UPDATE proplines 
SET prop_type = 'passing_yards'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 200
  AND NOT EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type = 'passing_yards'
  );

-- NFL rushing yards (medium lines: 50-200)
UPDATE proplines 
SET prop_type = 'rushing_yards'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 50 AND line <= 200
  AND NOT EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type = 'rushing_yards'
  );

-- NFL rushing attempts (medium lines: 15-50)
UPDATE proplines 
SET prop_type = 'rushing_attempts'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 15 AND line <= 50
  AND NOT EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type = 'rushing_attempts'
  );

-- NFL receptions (medium-low lines: 5-15)
UPDATE proplines 
SET prop_type = 'receiving_receptions'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 5 AND line <= 15
  AND NOT EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type = 'receiving_receptions'
  );

-- NFL passing touchdowns (low lines: 1-5)
UPDATE proplines 
SET prop_type = 'passing_touchdowns'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 1 AND line <= 5
  AND NOT EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type = 'passing_touchdowns'
  );

-- 5. Delete remaining conflicting over/under props
DELETE FROM proplines 
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND EXISTS (
    SELECT 1 FROM proplines p2 
    WHERE p2.player_id = proplines.player_id 
      AND p2.date = proplines.date 
      AND p2.sportsbook = proplines.sportsbook
      AND p2.prop_type != 'over/under'
  );

-- 6. Show final results
SELECT 
    league,
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE league = 'nfl'
GROUP BY league, prop_type
ORDER BY count DESC;

-- 7. Show remaining over/under props
SELECT 
    league,
    COUNT(*) as remaining_over_under
FROM proplines 
WHERE prop_type = 'over/under'
GROUP BY league
ORDER BY remaining_over_under DESC;
