-- Simple fix for prop types - run this in Supabase SQL Editor

-- 1. Clean up broken aliases
DELETE FROM prop_type_aliases WHERE canonical = 'undefined';

-- 2. Add essential prop type aliases
INSERT INTO prop_type_aliases (alias, canonical) VALUES
-- Passing props
('passing yards', 'passing_yards'),
('pass yards', 'passing_yards'),
('passing touchdowns', 'passing_touchdowns'),
('passing tds', 'passing_touchdowns'),
('passing attempts', 'passing_attempts'),
('passing completions', 'passing_completions'),
('passing interceptions', 'passing_interceptions'),

-- Rushing props  
('rushing yards', 'rushing_yards'),
('rush yards', 'rushing_yards'),
('rushing touchdowns', 'rushing_touchdowns'),
('rushing tds', 'rushing_touchdowns'),
('rushing attempts', 'rushing_attempts'),

-- Receiving props
('receiving yards', 'receiving_yards'),
('rec yards', 'receiving_yards'),
('receiving touchdowns', 'receiving_touchdowns'),
('receiving tds', 'receiving_touchdowns'),
('receptions', 'receiving_receptions'),

-- Combo props
('passing + rushing yards', 'passing_rushing_yards'),
('pass + rush yards', 'passing_rushing_yards'),
('rushing + receiving yards', 'rushing_receiving_yards'),
('rush + rec yards', 'rushing_receiving_yards')
ON CONFLICT (alias) DO UPDATE SET canonical = EXCLUDED.canonical;

-- 3. Fix existing over/under props based on line ranges
-- Passing yards (high lines: 200+)
UPDATE proplines 
SET prop_type = 'passing_yards'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 200;

-- Rushing yards (medium lines: 50-200)  
UPDATE proplines 
SET prop_type = 'rushing_yards'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 50 AND line <= 200;

-- Rushing attempts (medium lines: 15-50)
UPDATE proplines 
SET prop_type = 'rushing_attempts'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 15 AND line <= 50;

-- Receptions (medium-low lines: 5-15)
UPDATE proplines 
SET prop_type = 'receiving_receptions'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 5 AND line <= 15;

-- Passing touchdowns (low lines: 1-5)
UPDATE proplines 
SET prop_type = 'passing_touchdowns'
WHERE prop_type = 'over/under' 
  AND league = 'nfl'
  AND line >= 1 AND line <= 5;

-- 4. Show results
SELECT 
    prop_type, 
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE league = 'nfl'
GROUP BY prop_type
ORDER BY count DESC;
