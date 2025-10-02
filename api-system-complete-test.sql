-- Complete API Monitoring System Test
-- Run this after setting up tables and functions

-- Step 1: Verify all components exist
SELECT 'Step 1: Verifying system components...' as step;

-- Check tables
SELECT 'Tables:' as component;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'api_%'
ORDER BY table_name;

-- Check functions
SELECT 'Functions:' as component;
SELECT 
  r.routine_name,
  r.routine_type,
  r.data_type
FROM information_schema.routines r
WHERE r.routine_schema = 'public' 
AND r.routine_name LIKE '%sportsgameodds%'
ORDER BY r.routine_name;

-- Check plan configs
SELECT 'Plan Configurations:' as component;
SELECT 
  plan_name,
  monthly_request_limit,
  cost_per_request_usd,
  cache_hit_discount_percent,
  is_active
FROM public.api_plan_config
ORDER BY monthly_request_limit;

-- Step 2: Test logging function
SELECT 'Step 2: Testing API usage logging...' as step;
SELECT public.log_sportsgameodds_api_usage(
  auth.uid()::UUID,
  'player-props'::TEXT,
  'GET'::TEXT,
  'nfl'::TEXT,
  200::INTEGER,
  150::INTEGER,
  false::BOOLEAN,
  'sgo_test'::TEXT,
  'Statpedia/1.0'::TEXT,
  '127.0.0.1'::INET
);

SELECT public.log_sportsgameodds_api_usage(
  auth.uid()::UUID,
  'player-props'::TEXT,
  'GET'::TEXT,
  'nfl'::TEXT,
  200::INTEGER,
  50::INTEGER,
  true::BOOLEAN,
  'sgo_test'::TEXT,
  'Statpedia/1.0'::TEXT,
  '127.0.0.1'::INET
);

SELECT public.log_sportsgameodds_api_usage(
  auth.uid()::UUID,
  'events'::TEXT,
  'GET'::TEXT,
  'nba'::TEXT,
  200::INTEGER,
  200::INTEGER,
  false::BOOLEAN,
  'sgo_test'::TEXT,
  'Statpedia/1.0'::TEXT,
  '127.0.0.1'::INET
);

-- Step 3: Test usage statistics
SELECT 'Step 3: Testing usage statistics...' as step;
SELECT * FROM public.get_sportsgameodds_api_usage_stats(
  NULL::UUID, 
  (now() - interval '30 days')::TIMESTAMP WITH TIME ZONE, 
  now()::TIMESTAMP WITH TIME ZONE
);

-- Step 4: Test usage vs plan
SELECT 'Step 4: Testing usage vs plan...' as step;
SELECT * FROM public.get_sportsgameodds_api_usage_vs_plan(NULL::UUID);

-- Step 5: Show current usage data
SELECT 'Step 5: Current usage data...' as step;
SELECT 
  user_id,
  total_requests,
  cache_hits,
  cache_misses,
  estimated_cost_usd,
  requests_by_endpoint,
  requests_by_sport,
  updated_at
FROM public.api_current_usage
WHERE current_month_start = date_trunc('month', CURRENT_DATE);

-- Step 6: Show recent logs
SELECT 'Step 6: Recent usage logs...' as step;
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

-- Step 7: Show usage summary
SELECT 'Step 7: Usage summary...' as step;
SELECT 
  user_id,
  current_month_start,
  total_requests,
  cache_hits,
  cache_misses,
  estimated_cost_usd,
  updated_at
FROM public.api_usage_summary
WHERE current_month_start = date_trunc('month', CURRENT_DATE);

-- Step 8: Test with specific user
SELECT 'Step 8: Testing with specific user...' as step;
SELECT * FROM public.get_sportsgameodds_api_usage_stats(
  auth.uid()::UUID, 
  (now() - interval '7 days')::TIMESTAMP WITH TIME ZONE, 
  now()::TIMESTAMP WITH TIME ZONE
);

SELECT * FROM public.get_sportsgameodds_api_usage_vs_plan(auth.uid()::UUID);

-- Step 9: Performance test
SELECT 'Step 9: Performance test...' as step;
-- Log multiple requests to test performance
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        PERFORM public.log_sportsgameodds_api_usage(
            auth.uid(),
            'test-endpoint-' || i::TEXT,
            'GET',
            CASE WHEN i % 2 = 0 THEN 'nfl' ELSE 'nba' END,
            200,
            100 + (i * 10),
            i % 3 = 0,
            'sgo_perf_test',
            'PerformanceTest/1.0',
            '127.0.0.1'::inet
        );
    END LOOP;
END $$;

-- Step 10: Final verification
SELECT 'Step 10: Final verification...' as step;
SELECT 
  'Total logs' as metric,
  COUNT(*)::TEXT as value
FROM public.api_usage_logs
UNION ALL
SELECT 
  'Current month requests' as metric,
  COALESCE(SUM(total_requests), 0)::TEXT as value
FROM public.api_current_usage
WHERE current_month_start = date_trunc('month', CURRENT_DATE)
UNION ALL
SELECT 
  'Active plans' as metric,
  COUNT(*)::TEXT as value
FROM public.api_plan_config
WHERE is_active = true;

-- Step 11: System ready confirmation
SELECT 'Step 11: System Status...' as step;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.api_usage_logs LIMIT 1) THEN '✅ Logging working'
    ELSE '❌ No logs found'
  END as logging_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.api_current_usage LIMIT 1) THEN '✅ Usage tracking working'
    ELSE '❌ No usage data'
  END as usage_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.api_plan_config WHERE is_active = true) THEN '✅ Plan configs loaded'
    ELSE '❌ No plan configs'
  END as config_status;
