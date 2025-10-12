-- Clean up old problematic prop data
-- This script removes props with "over_under", "Over/Under", "receivingeptions", and other problematic prop types

-- 1. Delete all "over_under" props (the fallback that was being used incorrectly)
DELETE FROM proplines WHERE prop_type = 'over_under';

-- 2. Delete all "Over/Under" props (the capitalized version)
DELETE FROM proplines WHERE prop_type = 'Over/Under';

-- 3. Delete any props with "receivingeptions" typo
DELETE FROM proplines WHERE prop_type ILIKE '%receivingeptions%';

-- 4. Delete any props with "unknown" type (from failed normalization)
DELETE FROM proplines WHERE prop_type = 'unknown';

-- 5. Show summary of what was cleaned up
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

-- 6. Show current prop type distribution
SELECT 
  prop_type,
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM proplines 
GROUP BY prop_type 
ORDER BY count DESC 
LIMIT 20;
