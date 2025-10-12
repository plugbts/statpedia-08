-- Ultra-safe prop type cleanup that only deletes truly problematic props
-- This script avoids all UPDATE conflicts by only using DELETE operations

-- Step 1: Show current problematic prop distribution BEFORE cleanup
SELECT 
  'BEFORE CLEANUP - Problematic Props' as category,
  prop_type,
  COUNT(*) as count
FROM proplines 
WHERE prop_type IN ('over_under', 'Over/Under', 'unknown')
   OR prop_type ILIKE '%receivingeptions%'
GROUP BY prop_type
ORDER BY count DESC;

-- Step 2: Show current clean prop distribution BEFORE cleanup
SELECT 
  'BEFORE CLEANUP - Clean Props (Top 10)' as category,
  prop_type,
  COUNT(*) as count
FROM proplines 
WHERE prop_type NOT IN ('over_under', 'Over/Under', 'unknown')
  AND prop_type NOT ILIKE '%receivingeptions%'
GROUP BY prop_type 
ORDER BY count DESC 
LIMIT 10;

-- Step 3: SAFELY delete only the problematic props (no conflicts possible)
DELETE FROM proplines WHERE prop_type = 'over_under';
DELETE FROM proplines WHERE prop_type = 'Over/Under';
DELETE FROM proplines WHERE prop_type ILIKE '%receivingeptions%';
DELETE FROM proplines WHERE prop_type = 'unknown';

-- Step 4: Show what was actually deleted
SELECT 
  'AFTER CLEANUP - Remaining Problematic Props' as category,
  COUNT(*) as count
FROM proplines 
WHERE prop_type IN ('over_under', 'Over/Under', 'unknown')
   OR prop_type ILIKE '%receivingeptions%';

-- Step 5: Show current prop type distribution AFTER cleanup
SELECT 
  'AFTER CLEANUP - Clean Props (Top 15)' as category,
  prop_type,
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM proplines 
GROUP BY prop_type 
ORDER BY count DESC 
LIMIT 15;

-- Step 6: Show recent props to verify normalization is working
SELECT 
  'RECENT PROPS (Last Hour)' as category,
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

-- Step 7: Show total prop count before and after
SELECT 
  'FINAL SUMMARY' as category,
  COUNT(*) as total_props,
  COUNT(DISTINCT prop_type) as unique_prop_types,
  MIN(created_at) as oldest_prop,
  MAX(created_at) as newest_prop
FROM proplines;
