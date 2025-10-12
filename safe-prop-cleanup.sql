-- Safe prop type cleanup script that only updates problematic props
-- This script avoids duplicate key conflicts by being more selective

-- Step 1: Delete all problematic prop types first (safest operation)
DELETE FROM proplines WHERE prop_type = 'over_under';
DELETE FROM proplines WHERE prop_type = 'Over/Under';
DELETE FROM proplines WHERE prop_type ILIKE '%receivingeptions%';
DELETE FROM proplines WHERE prop_type = 'unknown';

-- Step 2: Show what problematic props remain after deletion
SELECT 
  'Remaining problematic props' as category,
  COUNT(*) as count
FROM proplines 
WHERE prop_type IN ('over_under', 'Over/Under', 'unknown')
   OR prop_type ILIKE '%receivingeptions%';

-- Step 3: Only update props that are clearly misnamed (avoid conflicts)
-- Only update if the pattern clearly indicates a different prop type

-- NFL - Only update if current prop_type is NOT already the target
UPDATE proplines 
SET prop_type = 'rushing_yards'
WHERE league = 'nfl' 
  AND prop_type != 'rushing_yards'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%rush%yard%' OR prop_type ILIKE '%rush%yd%')
  AND prop_type NOT ILIKE '%pass%'  -- Avoid combo props
  AND prop_type NOT ILIKE '%rec%';  -- Avoid combo props

UPDATE proplines 
SET prop_type = 'receiving_yards'
WHERE league = 'nfl' 
  AND prop_type != 'receiving_yards'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%receiv%yard%' OR prop_type ILIKE '%rec%yard%' OR prop_type ILIKE '%receiv%yd%' OR prop_type ILIKE '%rec%yd%')
  AND prop_type NOT ILIKE '%rush%'  -- Avoid combo props
  AND prop_type NOT ILIKE '%pass%'; -- Avoid combo props

UPDATE proplines 
SET prop_type = 'receptions'
WHERE league = 'nfl' 
  AND prop_type != 'receptions'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%reception%' OR prop_type ILIKE '%catches%')
  AND prop_type NOT ILIKE '%yard%'  -- Avoid receiving yards
  AND prop_type NOT ILIKE '%yd%';   -- Avoid receiving yards

-- Combo props - be very specific to avoid conflicts
UPDATE proplines 
SET prop_type = 'rush_rec_yards'
WHERE league = 'nfl' 
  AND prop_type != 'rush_rec_yards'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%rush%rec%' OR prop_type ILIKE '%rush+rec%' OR prop_type ILIKE '%rush + rec%')
  AND prop_type ILIKE '%yard%';  -- Must include yards

UPDATE proplines 
SET prop_type = 'pass_rush_yards'
WHERE league = 'nfl' 
  AND prop_type != 'pass_rush_yards'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%pass%rush%' OR prop_type ILIKE '%pass+rush%' OR prop_type ILIKE '%pass + rush%' OR prop_type ILIKE '%qb%rush%')
  AND prop_type ILIKE '%yard%';  -- Must include yards

UPDATE proplines 
SET prop_type = 'pass_rec_yards'
WHERE league = 'nfl' 
  AND prop_type != 'pass_rec_yards'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%pass%rec%' OR prop_type ILIKE '%pass+rec%' OR prop_type ILIKE '%pass + rec%' OR prop_type ILIKE '%qb%rec%')
  AND prop_type ILIKE '%yard%';  -- Must include yards

-- Touchdowns - be specific
UPDATE proplines 
SET prop_type = 'passing_tds'
WHERE league = 'nfl' 
  AND prop_type != 'passing_tds'  -- Avoid updating already correct ones
  AND ((prop_type ILIKE '%pass%td%' OR prop_type ILIKE '%qb%td%') OR prop_type ILIKE '%pass%touchdown%' OR prop_type ILIKE '%qb%touchdown%')
  AND prop_type NOT ILIKE '%rush%'  -- Avoid combo props
  AND prop_type NOT ILIKE '%rec%';  -- Avoid combo props

UPDATE proplines 
SET prop_type = 'rushing_tds'
WHERE league = 'nfl' 
  AND prop_type != 'rushing_tds'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%rush%td%' OR prop_type ILIKE '%rush%touchdown%')
  AND prop_type NOT ILIKE '%pass%'  -- Avoid combo props
  AND prop_type NOT ILIKE '%rec%';  -- Avoid combo props

UPDATE proplines 
SET prop_type = 'receiving_tds'
WHERE league = 'nfl' 
  AND prop_type != 'receiving_tds'  -- Avoid updating already correct ones
  AND ((prop_type ILIKE '%receiv%td%' OR prop_type ILIKE '%rec%td%') OR prop_type ILIKE '%receiv%touchdown%' OR prop_type ILIKE '%rec%touchdown%')
  AND prop_type NOT ILIKE '%pass%'  -- Avoid combo props
  AND prop_type NOT ILIKE '%rush%'; -- Avoid combo props

-- MLB - be specific and avoid conflicts
UPDATE proplines 
SET prop_type = 'strikeouts'
WHERE league = 'mlb' 
  AND prop_type != 'strikeouts'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%strikeout%' OR prop_type ILIKE '%strike out%' OR prop_type ILIKE '%ks%' OR prop_type ILIKE '%k%');

UPDATE proplines 
SET prop_type = 'hits'
WHERE league = 'mlb' 
  AND prop_type != 'hits'  -- Avoid updating already correct ones
  AND prop_type ILIKE '%hits%'
  AND prop_type NOT ILIKE '%allowed%';

UPDATE proplines 
SET prop_type = 'home_runs'
WHERE league = 'mlb' 
  AND prop_type != 'home_runs'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%home run%' OR prop_type ILIKE '%homer%' OR prop_type ILIKE '%hr%');

UPDATE proplines 
SET prop_type = 'total_bases'
WHERE league = 'mlb' 
  AND prop_type != 'total_bases'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%total bases%' OR prop_type ILIKE '%total base%');

UPDATE proplines 
SET prop_type = 'rbis'
WHERE league = 'mlb' 
  AND prop_type != 'rbis'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%rbis%' OR prop_type ILIKE '%rbi%' OR prop_type ILIKE '%runs batted in%');

UPDATE proplines 
SET prop_type = 'hits_allowed'
WHERE league = 'mlb' 
  AND prop_type != 'hits_allowed'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%hits allowed%' OR prop_type ILIKE '%hits allow%');

UPDATE proplines 
SET prop_type = 'earned_runs'
WHERE league = 'mlb' 
  AND prop_type != 'earned_runs'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%earned runs%' OR prop_type ILIKE '%earned run%' OR prop_type ILIKE '%er%');

UPDATE proplines 
SET prop_type = 'outs_recorded'
WHERE league = 'mlb' 
  AND prop_type != 'outs_recorded'  -- Avoid updating already correct ones
  AND (prop_type ILIKE '%outs recorded%' OR prop_type ILIKE '%out recorded%');

-- Step 4: Show summary of what was fixed
SELECT 
  'After Safe Cleanup - Problematic Props' as category,
  COUNT(*) as count
FROM proplines 
WHERE prop_type IN ('over_under', 'Over/Under', 'unknown')
   OR prop_type ILIKE '%receivingeptions%'

UNION ALL

SELECT 
  'After Safe Cleanup - Clean Props' as category,
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
