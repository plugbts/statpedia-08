-- Simple test script to verify API functions work
-- This avoids function conflicts by using explicit parameter types

-- Test the functions with explicit parameter types
SELECT 'Testing get_api_usage_stats with explicit parameters...' as test_step;
SELECT * FROM get_api_usage_stats(NULL::UUID, (now() - interval '30 days')::TIMESTAMP WITH TIME ZONE, now()::TIMESTAMP WITH TIME ZONE);

SELECT 'Testing get_api_usage_vs_plan with explicit parameters...' as test_step;
SELECT * FROM get_api_usage_vs_plan(NULL::UUID);

-- Test with specific user ID if you have one
-- SELECT * FROM get_api_usage_stats('your-user-id-here'::UUID);

-- Show what functions exist
SELECT 
  routine_name,
  routine_type,
  data_type,
  string_agg(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE routine_name LIKE '%api_usage%' 
  AND routine_schema = 'public'
GROUP BY routine_name, routine_type, data_type
ORDER BY routine_name, routine_type;
