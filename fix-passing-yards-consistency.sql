-- Fix the one inconsistent "Passing Yards" prop to use the standard "passing_yards" format

-- Check what we're fixing
SELECT 
    player_name,
    prop_type,
    line,
    team,
    opponent,
    date
FROM proplines 
WHERE prop_type = 'Passing Yards';

-- Fix the inconsistent naming
UPDATE proplines 
SET prop_type = 'passing_yards'
WHERE prop_type = 'Passing Yards';

-- Verify the fix
SELECT 
    player_name,
    prop_type,
    line,
    team,
    opponent,
    date
FROM proplines 
WHERE prop_type = 'passing_yards'
ORDER BY line DESC
LIMIT 5;

-- Show final passing yards count
SELECT 
    prop_type,
    COUNT(*) as count,
    MIN(line) as min_line,
    MAX(line) as max_line
FROM proplines 
WHERE prop_type = 'passing_yards'
GROUP BY prop_type;
