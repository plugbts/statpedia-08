-- API Functions Test with Explicit Type Casts Only
-- This follows the PostgreSQL hint to use explicit type casts

-- Step 1: Check what functions exist
SELECT 'Checking existing functions...' as step;
SELECT 
  r.routine_name,
  r.routine_type,
  r.data_type,
  string_agg(p.parameter_name || ' ' || p.data_type, ', ' ORDER BY p.ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
AND (r.routine_name LIKE '%api_usage%' OR r.routine_name LIKE '%log_api%')
GROUP BY r.routine_name, r.routine_type, r.data_type
ORDER BY r.routine_name, r.routine_type;

-- Step 2: Test log_api_usage with explicit type casts
SELECT 'Testing log_api_usage with explicit casts...' as step;
SELECT public.log_api_usage(
  auth.uid()::UUID,
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

-- Step 3: Test get_api_usage_stats with explicit type casts
SELECT 'Testing get_api_usage_stats with explicit casts...' as step;
SELECT * FROM public.get_api_usage_stats(
  NULL::UUID, 
  (now() - interval '30 days')::TIMESTAMP WITH TIME ZONE, 
  now()::TIMESTAMP WITH TIME ZONE
);

-- Step 4: Test get_api_usage_vs_plan with explicit type casts
SELECT 'Testing get_api_usage_vs_plan with explicit casts...' as step;
SELECT * FROM public.get_api_usage_vs_plan(NULL::UUID);

-- Step 5: Test with specific date range
SELECT 'Testing with specific date range...' as step;
SELECT * FROM public.get_api_usage_stats(
  NULL::UUID,
  '2024-01-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE,
  '2024-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE
);

-- Step 6: Show current usage data
SELECT 'Current usage data...' as step;
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

-- Step 7: Show recent logs
SELECT 'Recent usage logs...' as step;
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

-- Step 8: Show plan configurations
SELECT 'Plan configurations...' as step;
SELECT 
  plan_name,
  monthly_request_limit,
  cost_per_request_usd,
  cache_hit_discount_percent,
  is_active
FROM public.api_plan_config
ORDER BY monthly_request_limit;
