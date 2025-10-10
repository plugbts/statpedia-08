-- Fix conflict_key mismatch in player_game_logs table
-- The proplines table includes 'SportsGameOdds' in conflict_key, but player_game_logs doesn't

-- Update conflict_key in player_game_logs to match proplines format
UPDATE player_game_logs 
SET conflict_key = player_id || '|' || game_id || '|' || prop_type || '|' || league || '|' || season
WHERE conflict_key IS NULL OR conflict_key != player_id || '|' || game_id || '|' || prop_type || '|' || league || '|' || season;

-- Verify the update
SELECT 
    player_id,
    game_id,
    prop_type,
    league,
    season,
    conflict_key
FROM player_game_logs 
LIMIT 5;
