-- Clean up invalid prop types from player_game_logs

-- First, let's see what we have
SELECT prop_type, COUNT(*) as count
FROM player_game_logs
WHERE prop_type IN ('UNK ?', '-', '?', '')
   OR LENGTH(prop_type) = 1
   OR prop_type !~ '[A-Za-z]'  -- No letters
GROUP BY prop_type
ORDER BY count DESC;

-- Show affected records count
SELECT COUNT(*) as total_invalid
FROM player_game_logs
WHERE prop_type IN ('UNK ?', '-', '?', '')
   OR LENGTH(prop_type) = 1
   OR prop_type !~ '[A-Za-z]';

-- Delete invalid prop types
-- Uncomment to execute:
/*
DELETE FROM player_game_logs
WHERE prop_type IN ('UNK ?', '-', '?', '')
   OR LENGTH(prop_type) = 1
   OR prop_type !~ '[A-Za-z]';
*/

-- Show summary after cleanup
SELECT 
  COUNT(*) as total_logs,
  COUNT(DISTINCT prop_type) as unique_prop_types,
  COUNT(DISTINCT player_id) as unique_players,
  COUNT(DISTINCT game_id) as unique_games
FROM player_game_logs;

-- Show prop type distribution
SELECT prop_type, COUNT(*) as count
FROM player_game_logs
GROUP BY prop_type
ORDER BY count DESC
LIMIT 50;
