-- Check if PlayerGameLogs table has data
SELECT COUNT(*) as total_records FROM PlayerGameLogs;

-- Check sample data
SELECT * FROM PlayerGameLogs LIMIT 5;

-- Check specific player data
SELECT * FROM PlayerGameLogs WHERE player_id LIKE '%mahomes%' OR player_name LIKE '%Mahomes%' LIMIT 5;

-- Test the RPC functions
SELECT * FROM calculate_hit_rate('mahomes-patrick', 'Passing Yards', 275.0, 'over', 5);
SELECT * FROM calculate_streak('mahomes-patrick', 'Passing Yards', 275.0, 'over');
SELECT * FROM get_defensive_rank('KC', 'JAX', 'Passing Yards', 'QB', 2025);
