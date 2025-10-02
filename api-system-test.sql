-- Test API Usage System
-- Run this after both api-tables-setup.sql and api-functions-setup.sql

-- Step 1: Verify tables exist
SELECT 'Step 1: Verifying tables...' as step;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'api_%'
ORDER BY table_name;

-- Step 2: Verify plan config data
SELECT 'Step 2: Verifying plan config...' as step;
SELECT plan_name, monthly_request_limit, cost_per_request_usd, cache_hit_discount_percent 
FROM public.api_plan_config 
ORDER BY monthly_request_limit;

-- Step 3: Insert test data
SELECT 'Step 3: Inserting test data...' as step;
INSERT INTO public.api_usage_logs (
  user_id, endpoint, method, sport, response_status, response_time_ms, cache_hit, api_key_used, user_agent
) VALUES 
  (auth.uid(), 'player-props', 'GET', 'nfl', 200, 150, false, 'sgo_****', 'Statpedia/1.0'),
  (auth.uid(), 'player-props', 'GET', 'nfl', 200, 50, true, 'sgo_****', 'Statpedia/1.0'),
  (auth.uid(), 'events', 'GET', 'nba', 200, 200, false, 'sgo_****', 'Statpedia/1.0'),
  (auth.uid(), 'player-props', 'GET', 'nfl', 429, 1000, false, 'sgo_****', 'Statpedia/1.0')
ON CONFLICT DO NOTHING;

-- Step 4: Test log_api_usage function
SELECT 'Step 4: Testing log_api_usage function...' as step;
SELECT log_api_usage(
  auth.uid(),
  'test-endpoint',
  'GET',
  'nfl',
  200,
  100,
  false,
  'sgo_test',
  'TestAgent/1.0',
  '127.0.0.1'::inet
);

-- Step 5: Test get_api_usage_stats function
SELECT 'Step 5: Testing get_api_usage_stats...' as step;
SELECT * FROM get_api_usage_stats();

-- Step 6: Test get_api_usage_vs_plan function
SELECT 'Step 6: Testing get_api_usage_vs_plan...' as step;
SELECT * FROM get_api_usage_vs_plan();

-- Step 7: Show current usage data
SELECT 'Step 7: Current usage data...' as step;
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

-- Step 8: Show usage logs
SELECT 'Step 8: Recent usage logs...' as step;
SELECT 
  endpoint,
  sport,
  response_status,
  response_time_ms,
  cache_hit,
  created_at
FROM public.api_usage_logs
ORDER BY created_at DESC
LIMIT 10;
