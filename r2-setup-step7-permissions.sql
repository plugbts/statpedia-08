-- STEP 7: Grant Permissions
-- Run this section after Step 6

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_r2_usage(TEXT, TEXT, BIGINT, INTEGER, DECIMAL, TEXT, TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION get_r2_usage_stats(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_r2_usage_vs_plan(TEXT) TO authenticated;
