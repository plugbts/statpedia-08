-- Comprehensive cleanup and backfill script for prop type normalization
-- This script removes problematic data and ensures clean prop types

-- Step 1: Delete all problematic prop types
DELETE FROM proplines WHERE prop_type = 'over_under';
DELETE FROM proplines WHERE prop_type = 'Over/Under';
DELETE FROM proplines WHERE prop_type ILIKE '%receivingeptions%';
DELETE FROM proplines WHERE prop_type = 'unknown';

-- Step 2: Show summary of what was cleaned up
SELECT 
  'over_under' as prop_type,
  COUNT(*) as count
FROM proplines 
WHERE prop_type = 'over_under'

UNION ALL

SELECT 
  'Over/Under' as prop_type,
  COUNT(*) as count
FROM proplines 
WHERE prop_type = 'Over/Under'

UNION ALL

SELECT 
  'receivingeptions' as prop_type,
  COUNT(*) as count
FROM proplines 
WHERE prop_type ILIKE '%receivingeptions%'

UNION ALL

SELECT 
  'unknown' as prop_type,
  COUNT(*) as count
FROM proplines 
WHERE prop_type = 'unknown';

-- Step 3: Show current prop type distribution (top 20)
SELECT 
  prop_type,
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM proplines 
GROUP BY prop_type 
ORDER BY count DESC 
LIMIT 20;

-- Step 4: Show recent props to verify normalization is working
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
