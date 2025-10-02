-- Complete SportsGameOdds API Monitoring System Test
-- Run this to verify everything is working end-to-end

-- Step 1: System Status Check
SELECT 'Step 1: System Status Check' as step;

-- Check tables exist
SELECT 'Tables Status:' as component;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage_logs' AND table_schema = 'public') 
    THEN '✅ api_usage_logs'
    ELSE '❌ api_usage_logs'
  END as table_status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_plan_config' AND table_schema = 'public') 
    THEN '✅ api_plan_config'
    ELSE '❌ api_plan_config'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_current_usage' AND table_schema = 'public') 
    THEN '✅ api_current_usage'
    ELSE '❌ api_current_usage'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage_summary' AND table_schema = 'public') 
    THEN '✅ api_usage_summary'
    ELSE '❌ api_usage_summary'
  END;

-- Check functions exist
SELECT 'Functions Status:' as component;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name LIKE '%sportsgameodds%' AND routine_schema = 'public') 
    THEN '✅ SportsGameOdds functions'
    ELSE '❌ SportsGameOdds functions'
  END as function_status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_simple_api_analysis' AND routine_schema = 'public') 
    THEN '✅ Simple analysis function'
    ELSE '❌ Simple analysis function'
  END;

-- Step 2: Test Data Generation
SELECT 'Step 2: Generating Test Data' as step;

-- Generate some test API usage logs
DO $$
DECLARE
    i INTEGER;
    endpoints TEXT[] := ARRAY['player-props', 'events', 'odds'];
    sports TEXT[] := ARRAY['nfl', 'nba', 'mlb', 'nhl'];
    methods TEXT[] := ARRAY['GET', 'POST'];
    status_codes INTEGER[] := ARRAY[200, 201, 400, 429, 500];
BEGIN
    FOR i IN 1..20 LOOP
        INSERT INTO public.api_usage_logs (
            user_id, endpoint, method, sport, response_status, 
            response_time_ms, cache_hit, api_key_used, user_agent, ip_address
        ) VALUES (
            auth.uid(),
            endpoints[1 + (i % array_length(endpoints, 1))],
            methods[1 + (i % array_length(methods, 1))],
            sports[1 + (i % array_length(sports, 1))],
            status_codes[1 + (i % array_length(status_codes, 1))],
            50 + (i * 10),
            (i % 3 = 0),
            'sgo_test_' || i,
            'TestAgent/' || i,
            ('127.0.0.' || (i % 255))::INET
        );
    END LOOP;
END $$;

-- Step 3: Test Core Functions
SELECT 'Step 3: Testing Core Functions' as step;

-- Test logging function
SELECT 'Testing log function...' as test;
SELECT public.log_sportsgameodds_api_usage(
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

-- Test stats function
SELECT 'Testing stats function...' as test;
SELECT * FROM public.get_sportsgameodds_api_usage_stats(
    NULL::UUID, 
    (now() - interval '30 days')::TIMESTAMP WITH TIME ZONE, 
    now()::TIMESTAMP WITH TIME ZONE
);

-- Test vs plan function
SELECT 'Testing vs plan function...' as test;
SELECT * FROM public.get_sportsgameodds_api_usage_vs_plan(NULL::UUID);

-- Test simple analysis function
SELECT 'Testing simple analysis function...' as test;
SELECT * FROM get_simple_api_analysis();

-- Step 4: Data Verification
SELECT 'Step 4: Data Verification' as step;

-- Check usage logs
SELECT 'Usage Logs Count:' as metric, COUNT(*)::TEXT as value FROM public.api_usage_logs;

-- Check current usage
SELECT 'Current Usage Records:' as metric, COUNT(*)::TEXT as value FROM public.api_current_usage;

-- Check plan configs
SELECT 'Active Plans:' as metric, COUNT(*)::TEXT as value FROM public.api_plan_config WHERE is_active = true;

-- Step 5: Sample Data Display
SELECT 'Step 5: Sample Data' as step;

-- Show recent logs
SELECT 'Recent Usage Logs:' as info;
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

-- Show current usage
SELECT 'Current Usage Data:' as info;
SELECT 
    user_id,
    total_requests,
    cache_hits,
    cache_misses,
    estimated_cost_usd
FROM public.api_current_usage
WHERE current_month_start = date_trunc('month', CURRENT_DATE);

-- Show plan configs
SELECT 'Plan Configurations:' as info;
SELECT 
    plan_name,
    monthly_request_limit,
    cost_per_request_usd,
    cache_hit_discount_percent
FROM public.api_plan_config
WHERE is_active = true
ORDER BY monthly_request_limit;

-- Step 6: System Ready Confirmation
SELECT 'Step 6: System Status' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.api_usage_logs LIMIT 1) THEN '✅ Logging System'
        ELSE '❌ No Logs'
    END as logging_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.api_current_usage LIMIT 1) THEN '✅ Usage Tracking'
        ELSE '❌ No Usage Data'
    END as usage_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.api_plan_config WHERE is_active = true) THEN '✅ Plan Configs'
        ELSE '❌ No Plans'
    END as config_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name LIKE '%sportsgameodds%' AND routine_schema = 'public') THEN '✅ Functions'
        ELSE '❌ No Functions'
    END as function_status;

-- Step 7: Performance Test
SELECT 'Step 7: Performance Test' as step;

-- Test multiple rapid calls
DO $$
DECLARE
    i INTEGER;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    
    FOR i IN 1..5 LOOP
        PERFORM public.log_sportsgameodds_api_usage(
            auth.uid(),
            'perf-test-' || i::TEXT,
            'GET',
            'nfl',
            200,
            50 + i,
            i % 2 = 0,
            'sgo_perf',
            'PerfTest/1.0',
            '127.0.0.1'::inet
        );
    END LOOP;
    
    end_time := clock_timestamp();
    
    RAISE NOTICE 'Performance test completed in %', end_time - start_time;
END $$;

-- Final Summary
SELECT 'Step 8: Final Summary' as step;
SELECT 
    'System Components' as category,
    'Status' as status,
    'Notes' as notes
UNION ALL
SELECT 
    'Database Tables',
    CASE WHEN COUNT(*) = 4 THEN '✅ Complete' ELSE '❌ Missing' END,
    COUNT(*)::TEXT || ' tables found'
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'api_%'
UNION ALL
SELECT 
    'Functions',
    CASE WHEN COUNT(*) >= 3 THEN '✅ Complete' ELSE '❌ Missing' END,
    count(*)::TEXT || ' functions found'
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%sportsgameodds%'
UNION ALL
SELECT 
    'Test Data',
    CASE WHEN COUNT(*) > 0 THEN '✅ Generated' ELSE '❌ None' END,
    COUNT(*)::TEXT || ' log entries'
FROM public.api_usage_logs;
