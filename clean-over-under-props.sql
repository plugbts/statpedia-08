-- Clean up all Over/Under prop entries
-- This will remove the old entries so you only see properly mapped prop types

-- 1. First, let's see how many Over/Under entries we have
SELECT 
  'Over/Under entries to be removed' as action,
  COUNT(*) as count
FROM proplines 
WHERE prop_type = 'Over/Under';

-- 2. Show some examples of what will be removed
SELECT 
  'Examples of Over/Under entries' as info,
  player_name,
  prop_type,
  line,
  sportsbook,
  created_at
FROM proplines 
WHERE prop_type = 'Over/Under'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Remove all Over/Under entries
DELETE FROM proplines 
WHERE prop_type = 'Over/Under';

-- 4. Show remaining prop type distribution
SELECT 
  'Prop types after cleanup' as info,
  prop_type,
  COUNT(*) as count
FROM proplines 
WHERE league = 'nfl'
GROUP BY prop_type
ORDER BY count DESC;

-- 5. Show total remaining props
SELECT 
  'Total remaining NFL props' as info,
  COUNT(*) as total_count
FROM proplines 
WHERE league = 'nfl';
