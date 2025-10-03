-- Test Insights Functions
-- Run this after deploying the insights functions to verify they work

-- Test 1: Game Insights
SELECT 'Testing get_game_insights...' as test_name;
SELECT 
    insight_type,
    title,
    value,
    trend,
    confidence,
    team_name,
    opponent_name
FROM get_game_insights('nfl', 7) 
LIMIT 3;

-- Test 2: Player Insights  
SELECT 'Testing get_player_insights...' as test_name;
SELECT 
    insight_type,
    title,
    value,
    trend,
    confidence,
    player_name,
    team_name,
    position
FROM get_player_insights('nfl', 7) 
LIMIT 3;

-- Test 3: Moneyline Insights
SELECT 'Testing get_moneyline_insights...' as test_name;
SELECT 
    insight_type,
    title,
    value,
    trend,
    confidence,
    team_name,
    opponent_name,
    underdog_opportunity
FROM get_moneyline_insights('nfl', 7) 
LIMIT 2;

-- Test 4: Analytics Summary
SELECT 'Testing get_prediction_analytics_summary...' as test_name;
SELECT 
    total_predictions,
    win_rate,
    total_profit,
    avg_confidence,
    best_performing_prop,
    worst_performing_prop,
    hot_players,
    cold_players
FROM get_prediction_analytics_summary('nfl', 30);

-- Test 5: Function Count Check
SELECT 'Function deployment verification...' as test_name;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'get_%insights%'
ORDER BY routine_name;
