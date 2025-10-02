-- Complete API Functions Recreation with Unique Names
-- This creates functions with unique names to avoid conflicts

-- Step 1: Drop ALL existing functions completely
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions that contain api_usage or log_api
    FOR func_record IN 
        SELECT routine_name, specific_name
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND (routine_name LIKE '%api_usage%' OR routine_name LIKE '%log_api%')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', func_record.specific_name);
    END LOOP;
END $$;

-- Step 2: Create log_api_usage function with unique name
CREATE OR REPLACE FUNCTION public.log_sportsgameodds_api_usage(
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_sport TEXT,
  p_response_status INTEGER,
  p_response_time_ms INTEGER,
  p_cache_hit BOOLEAN DEFAULT false,
  p_api_key_used TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_month_start DATE;
  cost_per_request DECIMAL(8,6);
  cache_discount DECIMAL(5,2);
  request_cost DECIMAL(10,4);
BEGIN
  -- Get current month start
  current_month_start := date_trunc('month', CURRENT_DATE);
  
  -- Get plan configuration for cost calculation
  SELECT 
    config.cost_per_request_usd,
    config.cache_hit_discount_percent
  INTO cost_per_request, cache_discount
  FROM public.api_plan_config config
  WHERE config.is_active = true
  ORDER BY config.monthly_request_limit ASC
  LIMIT 1;
  
  -- Calculate request cost with cache discount
  request_cost := cost_per_request;
  IF p_cache_hit THEN
    request_cost := request_cost * (1 - cache_discount / 100);
  END IF;
  
  -- Insert usage log
  INSERT INTO public.api_usage_logs (
    user_id, endpoint, method, sport, response_status, 
    response_time_ms, cache_hit, api_key_used, user_agent, ip_address
  ) VALUES (
    p_user_id, p_endpoint, p_method, p_sport, p_response_status,
    p_response_time_ms, p_cache_hit, p_api_key_used, p_user_agent, p_ip_address
  );
  
  -- Update current usage summary
  INSERT INTO public.api_current_usage (
    user_id, current_month_start, total_requests, total_response_time_ms,
    cache_hits, cache_misses, requests_by_endpoint, requests_by_sport, estimated_cost_usd
  ) VALUES (
    p_user_id, current_month_start, 1, p_response_time_ms,
    CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    CASE WHEN p_cache_hit THEN 0 ELSE 1 END,
    jsonb_build_object(p_endpoint, 1),
    CASE WHEN p_sport IS NOT NULL THEN jsonb_build_object(p_sport, 1) ELSE '{}' END,
    request_cost
  )
  ON CONFLICT (user_id, current_month_start) DO UPDATE SET
    total_requests = api_current_usage.total_requests + 1,
    total_response_time_ms = api_current_usage.total_response_time_ms + p_response_time_ms,
    cache_hits = api_current_usage.cache_hits + CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    cache_misses = api_current_usage.cache_misses + CASE WHEN p_cache_hit THEN 0 ELSE 1 END,
    requests_by_endpoint = api_current_usage.requests_by_endpoint || 
      jsonb_build_object(p_endpoint, COALESCE((api_current_usage.requests_by_endpoint->>p_endpoint)::INTEGER, 0) + 1),
    requests_by_sport = CASE 
      WHEN p_sport IS NOT NULL THEN 
        api_current_usage.requests_by_sport || 
        jsonb_build_object(p_sport, COALESCE((api_current_usage.requests_by_sport->>p_sport)::INTEGER, 0) + 1)
      ELSE api_current_usage.requests_by_sport 
    END,
    estimated_cost_usd = api_current_usage.estimated_cost_usd + request_cost,
    updated_at = now();
    
  -- Update monthly summary
  INSERT INTO public.api_usage_summary (
    user_id, current_month_start, total_requests, total_response_time_ms,
    cache_hits, cache_misses, requests_by_endpoint, requests_by_sport, estimated_cost_usd
  ) VALUES (
    p_user_id, current_month_start, 1, p_response_time_ms,
    CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    CASE WHEN p_cache_hit THEN 0 ELSE 1 END,
    jsonb_build_object(p_endpoint, 1),
    CASE WHEN p_sport IS NOT NULL THEN jsonb_build_object(p_sport, 1) ELSE '{}' END,
    request_cost
  )
  ON CONFLICT (user_id, current_month_start) DO UPDATE SET
    total_requests = api_usage_summary.total_requests + 1,
    total_response_time_ms = api_usage_summary.total_response_time_ms + p_response_time_ms,
    cache_hits = api_usage_summary.cache_hits + CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    cache_misses = api_usage_summary.cache_misses + CASE WHEN p_cache_hit THEN 0 ELSE 1 END,
    requests_by_endpoint = api_usage_summary.requests_by_endpoint || 
      jsonb_build_object(p_endpoint, COALESCE((api_usage_summary.requests_by_endpoint->>p_endpoint)::INTEGER, 0) + 1),
    requests_by_sport = CASE 
      WHEN p_sport IS NOT NULL THEN 
        api_usage_summary.requests_by_sport || 
        jsonb_build_object(p_sport, COALESCE((api_usage_summary.requests_by_sport->>p_sport)::INTEGER, 0) + 1)
      ELSE api_usage_summary.requests_by_sport 
    END,
    estimated_cost_usd = api_usage_summary.estimated_cost_usd + request_cost,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create get_sportsgameodds_api_usage_stats function with unique name
CREATE OR REPLACE FUNCTION public.get_sportsgameodds_api_usage_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT (now() - interval '30 days'),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
  user_id UUID,
  total_requests BIGINT,
  total_response_time_ms BIGINT,
  avg_response_time_ms DECIMAL,
  cache_hit_rate DECIMAL,
  requests_by_endpoint JSONB,
  requests_by_sport JSONB,
  total_cost_usd DECIMAL,
  error_rate DECIMAL
) AS $$
DECLARE
  default_cost DECIMAL(8,6) := 0.001;
BEGIN
  RETURN QUERY
  SELECT 
    logs.user_id,
    COUNT(*)::BIGINT as total_requests,
    SUM(logs.response_time_ms)::BIGINT as total_response_time_ms,
    ROUND(AVG(logs.response_time_ms), 2) as avg_response_time_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE logs.cache_hit = true)::DECIMAL / COUNT(*)) * 100, 2
    ) as cache_hit_rate,
    COALESCE(
      jsonb_object_agg(
        logs.endpoint, 
        endpoint_count
      ) FILTER (WHERE endpoint_count IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_endpoint,
    COALESCE(
      jsonb_object_agg(
        logs.sport, 
        sport_count
      ) FILTER (WHERE sport_count IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_sport,
    ROUND(SUM(
      CASE 
        WHEN logs.cache_hit THEN 
          COALESCE(
            (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
            default_cost
          ) * 
          (1 - COALESCE(
            (SELECT cache_hit_discount_percent FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
            0
          ) / 100)
        ELSE 
          COALESCE(
            (SELECT cost_per_request_usd FROM public.api_plan_config WHERE is_active = true ORDER BY monthly_request_limit ASC LIMIT 1),
            default_cost
          )
      END
    ), 4) as total_cost_usd,
    ROUND(
      (COUNT(*) FILTER (WHERE logs.response_status >= 400)::DECIMAL / COUNT(*)) * 100, 2
    ) as error_rate
  FROM public.api_usage_logs logs
  LEFT JOIN (
    SELECT 
      endpoint_logs.endpoint,
      COUNT(*) as endpoint_count
    FROM public.api_usage_logs endpoint_logs
    WHERE (p_user_id IS NULL OR endpoint_logs.user_id = p_user_id)
      AND endpoint_logs.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY endpoint_logs.endpoint
  ) endpoint_stats ON logs.endpoint = endpoint_stats.endpoint
  LEFT JOIN (
    SELECT 
      sport_logs.sport,
      COUNT(*) as sport_count
    FROM public.api_usage_logs sport_logs
    WHERE (p_user_id IS NULL OR sport_logs.user_id = p_user_id)
      AND sport_logs.created_at BETWEEN p_start_date AND p_end_date
      AND sport_logs.sport IS NOT NULL
    GROUP BY sport_logs.sport
  ) sport_stats ON logs.sport = sport_stats.sport
  WHERE (p_user_id IS NULL OR logs.user_id = p_user_id)
    AND logs.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY logs.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create get_sportsgameodds_api_usage_vs_plan function with unique name
CREATE OR REPLACE FUNCTION public.get_sportsgameodds_api_usage_vs_plan(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  plan_name TEXT,
  current_month_start DATE,
  total_requests BIGINT,
  request_limit BIGINT,
  usage_percent DECIMAL,
  cache_hit_rate DECIMAL,
  estimated_cost_usd DECIMAL,
  projected_monthly_cost DECIMAL,
  days_remaining INTEGER,
  recommendations TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    usage.user_id,
    config.plan_name,
    usage.current_month_start,
    usage.total_requests,
    config.monthly_request_limit as request_limit,
    ROUND(
      (usage.total_requests::DECIMAL / config.monthly_request_limit) * 100, 2
    ) as usage_percent,
    ROUND(
      (usage.cache_hits::DECIMAL / NULLIF(usage.cache_hits + usage.cache_misses, 0)) * 100, 2
    ) as cache_hit_rate,
    usage.estimated_cost_usd,
    ROUND(
      (usage.estimated_cost_usd / EXTRACT(DAY FROM CURRENT_DATE)) * 
      EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')), 2
    ) as projected_monthly_cost,
    EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day') - CURRENT_DATE)::INTEGER as days_remaining,
    ARRAY[
      CASE 
        WHEN usage.total_requests::DECIMAL / config.monthly_request_limit > 0.8 THEN 'Consider upgrading plan - approaching limit'
        WHEN usage.total_requests::DECIMAL / config.monthly_request_limit > 0.6 THEN 'Monitor usage closely - 60% of limit reached'
        ELSE 'Usage is within normal range'
      END,
      CASE 
        WHEN (usage.cache_hits::DECIMAL / NULLIF(usage.cache_hits + usage.cache_misses, 0)) < 0.5 THEN 'Low cache hit rate - consider optimizing caching'
        ELSE 'Cache performance is good'
      END,
      CASE 
        WHEN (usage.estimated_cost_usd / EXTRACT(DAY FROM CURRENT_DATE)) * 30 > config.monthly_request_limit * config.cost_per_request_usd THEN 'Projected cost exceeds plan value'
        ELSE 'Cost projection is within plan value'
      END
    ] as recommendations
  FROM public.api_current_usage usage
  CROSS JOIN public.api_plan_config config
  WHERE config.is_active = true
    AND (p_user_id IS NULL OR usage.user_id = p_user_id)
    AND usage.current_month_start = date_trunc('month', CURRENT_DATE)
  ORDER BY config.monthly_request_limit ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.log_sportsgameodds_api_usage(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, TEXT, TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sportsgameodds_api_usage_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sportsgameodds_api_usage_vs_plan(UUID) TO authenticated;

-- Step 6: Test the new functions with explicit type casts
SELECT 'Testing new functions with explicit type casts...' as step;

-- Test log function
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
SELECT * FROM public.get_sportsgameodds_api_usage_stats(
  NULL::UUID, 
  (now() - interval '30 days')::TIMESTAMP WITH TIME ZONE, 
  now()::TIMESTAMP WITH TIME ZONE
);

-- Test vs plan function
SELECT * FROM public.get_sportsgameodds_api_usage_vs_plan(NULL::UUID);

-- Step 7: Show function verification
SELECT 'Function verification:' as step;
SELECT 
  r.routine_name,
  r.routine_type,
  r.data_type
FROM information_schema.routines r
WHERE r.routine_schema = 'public' 
AND r.routine_name LIKE '%sportsgameodds%'
ORDER BY r.routine_name;
