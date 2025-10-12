-- Fix Duplicate Key Conflicts: Remove Over/Under entries that conflict with proper prop types
-- This script removes old "Over/Under" entries that are now conflicting with properly mapped prop types

-- 1. First, let's see what conflicts we have
SELECT 
  'Conflicts found' as status,
  COUNT(*) as conflict_count
FROM proplines 
WHERE prop_type = 'Over/Under' 
  AND conflict_key IN (
    SELECT conflict_key 
    FROM proplines 
    WHERE prop_type != 'Over/Under'
  );

-- 2. Show some examples of the conflicts
SELECT 
  'Example conflicts' as info,
  conflict_key,
  prop_type,
  player_name,
  line,
  sportsbook,
  created_at
FROM proplines 
WHERE prop_type = 'Over/Under' 
  AND conflict_key IN (
    SELECT conflict_key 
    FROM proplines 
    WHERE prop_type != 'Over/Under'
  )
ORDER BY created_at DESC
LIMIT 10;

-- 3. Remove the conflicting Over/Under entries
-- This will allow the properly mapped prop types to be inserted
DELETE FROM proplines 
WHERE prop_type = 'Over/Under' 
  AND conflict_key IN (
    SELECT conflict_key 
    FROM proplines 
    WHERE prop_type != 'Over/Under'
  );

-- 4. Show the results
SELECT 
  'Cleanup completed' as status,
  COUNT(*) as remaining_over_under_count
FROM proplines 
WHERE prop_type = 'Over/Under';

-- 5. Show distribution of prop types after cleanup
SELECT 
  'Prop type distribution' as info,
  prop_type,
  COUNT(*) as count
FROM proplines 
WHERE league = 'nfl'
GROUP BY prop_type
ORDER BY count DESC;
