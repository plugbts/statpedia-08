-- Simple API Functions Test (Explicit Calls Only)
-- This avoids function conflicts by using explicit parameter types

-- Test 1: Check if functions exist
SELECT 'Checking function existence...' as test;
SELECT 
  r.routine_name,
  r.routine_type,
  r.data_type
FROM information_schema.routines r
WHERE r.routine_schema = 'public' 
AND (r.routine_name LIKE '%api_usage%' OR r.routine_name LIKE '%log_api%')
ORDER BY r.routine_name;

-- Test 2: Test log_api_usage with explicit parameters
SELECT 'Testing log_api_usage...' as test;
SELECT public.log_api_usage(
  auth.uid(),
  'test-endpoint'::TEXT,
  'GET'::TEXT,
  'nfl'::TEXT,
  200::INTEGER,
  100::INTEGER,
  false::BOOLEAN,
  'sgo_test'::TEXT,
  'TestAgent/1.0'::TEXT,
  '127.0.0.1'::INET
);

-- Test 3: Test get_api_usage_stats with explicit parameters
SELECT 'Testing get_api_usage_stats with explicit params...' as test;
SELECT * FROM public.get_api_usage_stats(
  NULL::UUID, 
  (now() - interval '30 days')::TIMESTAMP WITH TIME ZONE, 
  now()::TIMESTAMP WITH TIME ZONE
);

-- Test 4: Test get_api_usage_vs_plan with explicit parameters
SELECT 'Testing get_api_usage_vs_plan with explicit params...' as test;
SELECT * FROM public.get_api_usage_vs_plan(NULL::UUID);

-- Test 5: Test with specific user ID (if you have one)
-- SELECT 'Testing with specific user...' as test;
-- SELECT * FROM public.get_api_usage_stats('your-user-id-here'::UUID);

-- Test 6: Show current usage data
SELECT 'Current usage data...' as test;
SELECT 
  user_id,
  total_requests,
  cache_hits,
  cache_misses,
  estimated_cost_usd,
  requests_by_endpoint,
  requests_by_sport
FROM public.api_current_usage
WHERE current_month_start = date_trunc('month', CURRENT_DATE);

-- Test 7: Show recent logs
SELECT 'Recent usage logs...' as test;
SELECT 
  endpoint,
  sport,
  response_status,
  response_time_ms,
  cache_hit,
  created_at
FROM public.api_usage_logs
ORDER BY created_at DESC
LIMIT 5;
