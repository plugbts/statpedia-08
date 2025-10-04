-- Deploy Insights Functions Directly
-- This script can be run directly in Supabase SQL Editor

-- Function to get game insights from real predictions
CREATE OR REPLACE FUNCTION get_game_insights(
    sport_filter TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    insight_id TEXT,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    value NUMERIC,
    trend TEXT,
    change_percent NUMERIC,
    confidence INTEGER,
    team_name TEXT,
    opponent_name TEXT,
    game_date DATE,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return mock data for now since we don't have the games table yet
    RETURN QUERY
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'home_win_rate' as insight_type,
        'Home Team Win Rate' as title,
        'Home teams win 64.3% of games' as description,
        64.3 as value,
        'up' as trend,
        2.1 as change_percent,
        85 as confidence,
        'Chiefs' as team_name,
        'Raiders' as opponent_name,
        CURRENT_DATE as game_date,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'over_under_trend' as insight_type,
        'Over/Under Trends' as title,
        'Games with totals 45+ hit the over 68.9% in recent weeks' as description,
        68.9 as value,
        'up' as trend,
        8.7 as change_percent,
        91 as confidence,
        'Bills' as team_name,
        'Dolphins' as opponent_name,
        CURRENT_DATE as game_date,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'favorite_performance' as insight_type,
        'Favorite Performance' as title,
        'Teams favored by 3+ points cover 58.7% of the time' as description,
        58.7 as value,
        'up' as trend,
        2.1 as change_percent,
        82 as confidence,
        'Lakers' as team_name,
        'Warriors' as opponent_name,
        CURRENT_DATE as game_date,
        NOW() as created_at;
END;
$$;

-- Function to get player insights from prediction data
CREATE OR REPLACE FUNCTION get_player_insights(
    sport_filter TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    insight_id TEXT,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    value NUMERIC,
    trend TEXT,
    change_percent NUMERIC,
    confidence INTEGER,
    player_name TEXT,
    team_name TEXT,
    position TEXT,
    last_game_date DATE,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return mock data for now since we don't have the player_predictions table yet
    RETURN QUERY
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'hot_streak' as insight_type,
        'Hot Streak Alert' as title,
        'Player has exceeded prop line in 7 of last 8 games' as description,
        87.5 as value,
        'up' as trend,
        12.3 as change_percent,
        94 as confidence,
        'Josh Allen' as player_name,
        'BUF' as team_name,
        'QB' as position,
        CURRENT_DATE as last_game_date,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'home_advantage' as insight_type,
        'Home Field Advantage' as title,
        'Player performs 23% better at home vs away' as description,
        23.0 as value,
        'up' as trend,
        4.2 as change_percent,
        88 as confidence,
        'LeBron James' as player_name,
        'LAL' as team_name,
        'SF' as position,
        CURRENT_DATE as last_game_date,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'vs_opponent' as insight_type,
        'vs Opponent History' as title,
        'Player averages 15% above season average vs this opponent' as description,
        15.0 as value,
        'up' as trend,
        2.8 as change_percent,
        85 as confidence,
        'Travis Kelce' as player_name,
        'KC' as team_name,
        'TE' as position,
        CURRENT_DATE as last_game_date,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'recent_form' as insight_type,
        'Recent Form' as title,
        'Player has been trending up with 3 straight over performances' as description,
        75.0 as value,
        'up' as trend,
        18.5 as change_percent,
        92 as confidence,
        'Tyreek Hill' as player_name,
        'MIA' as team_name,
        'WR' as position,
        CURRENT_DATE as last_game_date,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'cold_streak' as insight_type,
        'Cold Streak Warning' as title,
        'Player has been under prop line in 5 of last 6 games' as description,
        16.7 as value,
        'down' as trend,
        -22.1 as change_percent,
        78 as confidence,
        'Russell Wilson' as player_name,
        'DEN' as team_name,
        'QB' as position,
        CURRENT_DATE as last_game_date,
        NOW() as created_at;
END;
$$;

-- Function to get moneyline insights
CREATE OR REPLACE FUNCTION get_moneyline_insights(
    sport_filter TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    insight_id TEXT,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    value NUMERIC,
    trend TEXT,
    change_percent NUMERIC,
    confidence INTEGER,
    team_name TEXT,
    opponent_name TEXT,
    game_date DATE,
    underdog_opportunity BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return mock data for now
    RETURN QUERY
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'underdog_win_rate' as insight_type,
        'Underdog Win Rate' as title,
        'Underdogs win 38.2% of games with significant spreads' as description,
        38.2 as value,
        'up' as trend,
        3.2 as change_percent,
        85 as confidence,
        'Jets' as team_name,
        'Patriots' as opponent_name,
        CURRENT_DATE as game_date,
        TRUE as underdog_opportunity,
        NOW() as created_at
    UNION ALL
    SELECT 
        gen_random_uuid()::TEXT as insight_id,
        'home_moneyline_advantage' as insight_type,
        'Home Moneyline Advantage' as title,
        'Home teams win moneyline 64.3% of the time' as description,
        64.3 as value,
        'neutral' as trend,
        0.2 as change_percent,
        78 as confidence,
        'Cowboys' as team_name,
        'Eagles' as opponent_name,
        CURRENT_DATE as game_date,
        FALSE as underdog_opportunity,
        NOW() as created_at;
END;
$$;

-- Function to get prediction analytics summary
CREATE OR REPLACE FUNCTION get_prediction_analytics_summary(
    sport_filter TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_predictions BIGINT,
    win_rate NUMERIC,
    total_profit NUMERIC,
    avg_confidence NUMERIC,
    best_performing_prop TEXT,
    worst_performing_prop TEXT,
    hot_players TEXT[],
    cold_players TEXT[],
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return mock data for now
    RETURN QUERY
    SELECT 
        1247::BIGINT as total_predictions,
        68.3::NUMERIC as win_rate,
        2847.50::NUMERIC as total_profit,
        82.1::NUMERIC as avg_confidence,
        'Passing Yards'::TEXT as best_performing_prop,
        'Rushing Yards'::TEXT as worst_performing_prop,
        ARRAY['Josh Allen', 'Travis Kelce', 'Tyreek Hill', 'Davante Adams', 'Cooper Kupp']::TEXT[] as hot_players,
        ARRAY['Russell Wilson', 'Baker Mayfield', 'Kenny Pickett', 'Desmond Ridder', 'Sam Howell']::TEXT[] as cold_players,
        NOW() as created_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_game_insights(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_insights(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_prediction_analytics_summary(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_moneyline_insights(TEXT, INTEGER) TO authenticated;

-- Test the functions
SELECT 'Testing get_game_insights...' as test;
SELECT * FROM get_game_insights('nfl', 7) LIMIT 3;

SELECT 'Testing get_player_insights...' as test;
SELECT * FROM get_player_insights('nfl', 7) LIMIT 3;

SELECT 'Testing get_moneyline_insights...' as test;
SELECT * FROM get_moneyline_insights('nfl', 7) LIMIT 2;

SELECT 'Testing get_prediction_analytics_summary...' as test;
SELECT * FROM get_prediction_analytics_summary('nfl', 30);
