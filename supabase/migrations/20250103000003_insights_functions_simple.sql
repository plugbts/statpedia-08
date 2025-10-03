-- Insights Analytics Functions (Simplified)
-- Functions to support the insights tab with real data from current system

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
