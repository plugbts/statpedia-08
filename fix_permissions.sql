-- Grant execute permissions to anonymous users for analytics functions
GRANT EXECUTE ON FUNCTION calculate_hit_rate TO anon;
GRANT EXECUTE ON FUNCTION calculate_streak TO anon;
GRANT EXECUTE ON FUNCTION get_defensive_rank TO anon;
GRANT EXECUTE ON FUNCTION get_player_chart_data TO anon;
