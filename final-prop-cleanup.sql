-- Final comprehensive prop type cleanup and backfill
-- This script fixes all existing "over_under" and problematic props

-- Step 1: Delete all problematic prop types first
DELETE FROM proplines WHERE prop_type = 'over_under';
DELETE FROM proplines WHERE prop_type = 'Over/Under';
DELETE FROM proplines WHERE prop_type ILIKE '%receivingeptions%';
DELETE FROM proplines WHERE prop_type = 'unknown';

-- Step 2: Backfill NFL props with expanded patterns
UPDATE proplines 
SET prop_type = 'passing_yards'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%pass%yard%' 
       OR prop_type ILIKE '%qb%yard%'
       OR prop_type ILIKE '%pass%yd%'
       OR prop_type ILIKE '%qb%yd%');

UPDATE proplines 
SET prop_type = 'rushing_yards'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%rush%yard%'
       OR prop_type ILIKE '%rush%yd%');

UPDATE proplines 
SET prop_type = 'receiving_yards'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%receiv%yard%'
       OR prop_type ILIKE '%rec%yard%'
       OR prop_type ILIKE '%receiv%yd%'
       OR prop_type ILIKE '%rec%yd%');

UPDATE proplines 
SET prop_type = 'receptions'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%reception%'
       OR prop_type ILIKE '%catches%'
       OR prop_type ILIKE '%rec%'
       AND prop_type NOT ILIKE '%yard%'
       AND prop_type NOT ILIKE '%yd%');

UPDATE proplines 
SET prop_type = 'rush_rec_yards'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%rush%rec%'
       OR prop_type ILIKE '%rush+rec%'
       OR prop_type ILIKE '%rush + rec%');

UPDATE proplines 
SET prop_type = 'pass_rush_yards'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%pass%rush%'
       OR prop_type ILIKE '%pass+rush%'
       OR prop_type ILIKE '%pass + rush%'
       OR prop_type ILIKE '%qb%rush%');

UPDATE proplines 
SET prop_type = 'pass_rec_yards'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%pass%rec%'
       OR prop_type ILIKE '%pass+rec%'
       OR prop_type ILIKE '%pass + rec%'
       OR prop_type ILIKE '%qb%rec%');

-- Touchdowns
UPDATE proplines 
SET prop_type = 'passing_tds'
WHERE league = 'nfl' 
  AND ((prop_type ILIKE '%pass%td%' OR prop_type ILIKE '%qb%td%')
       OR prop_type ILIKE '%pass%touchdown%'
       OR prop_type ILIKE '%qb%touchdown%');

UPDATE proplines 
SET prop_type = 'rushing_tds'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%rush%td%'
       OR prop_type ILIKE '%rush%touchdown%');

UPDATE proplines 
SET prop_type = 'receiving_tds'
WHERE league = 'nfl' 
  AND ((prop_type ILIKE '%receiv%td%' OR prop_type ILIKE '%rec%td%')
       OR prop_type ILIKE '%receiv%touchdown%'
       OR prop_type ILIKE '%rec%touchdown%');

UPDATE proplines 
SET prop_type = 'anytime_td'
WHERE league = 'nfl' 
  AND (prop_type ILIKE '%anytime%td%'
       OR prop_type ILIKE '%anytime%touchdown%');

-- Step 3: Backfill MLB props with expanded patterns
UPDATE proplines 
SET prop_type = 'strikeouts'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%strikeout%'
       OR prop_type ILIKE '%strike out%'
       OR prop_type ILIKE '%ks%'
       OR prop_type ILIKE '%k%');

UPDATE proplines 
SET prop_type = 'hits'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%hits%'
       AND prop_type NOT ILIKE '%allowed%');

UPDATE proplines 
SET prop_type = 'home_runs'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%home run%'
       OR prop_type ILIKE '%homer%'
       OR prop_type ILIKE '%hr%');

UPDATE proplines 
SET prop_type = 'total_bases'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%total bases%'
       OR prop_type ILIKE '%total base%');

UPDATE proplines 
SET prop_type = 'rbis'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%rbis%'
       OR prop_type ILIKE '%rbi%'
       OR prop_type ILIKE '%runs batted in%');

UPDATE proplines 
SET prop_type = 'hits_allowed'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%hits allowed%'
       OR prop_type ILIKE '%hits allow%');

UPDATE proplines 
SET prop_type = 'earned_runs'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%earned runs%'
       OR prop_type ILIKE '%earned run%'
       OR prop_type ILIKE '%er%');

UPDATE proplines 
SET prop_type = 'outs_recorded'
WHERE league = 'mlb' 
  AND (prop_type ILIKE '%outs recorded%'
       OR prop_type ILIKE '%out recorded%');

-- Step 4: Show summary of what was fixed
SELECT 
  'After Cleanup - Problematic Props' as category,
  COUNT(*) as count
FROM proplines 
WHERE prop_type IN ('over_under', 'Over/Under', 'unknown')
   OR prop_type ILIKE '%receivingeptions%'

UNION ALL

SELECT 
  'After Cleanup - Clean Props' as category,
  COUNT(*) as count
FROM proplines 
WHERE prop_type NOT IN ('over_under', 'Over/Under', 'unknown')
  AND prop_type NOT ILIKE '%receivingeptions%';

-- Step 5: Show current prop type distribution (top 20)
SELECT 
  prop_type,
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM proplines 
GROUP BY prop_type 
ORDER BY count DESC 
LIMIT 20;

-- Step 6: Show recent props to verify normalization is working
SELECT 
  player_name,
  prop_type,
  line,
  over_odds,
  under_odds,
  created_at
FROM proplines 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 10;
