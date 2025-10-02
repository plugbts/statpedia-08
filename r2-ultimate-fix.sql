-- ULTIMATE R2 Function Fix - All Issues Resolved
-- Run this to fix all type mismatches and ensure everything works

-- Fix 1: get_r2_usage_vs_plan function (INTEGER types)
DROP FUNCTION IF EXISTS get_r2_usage_vs_plan(TEXT);

CREATE OR REPLACE FUNCTION get_r2_usage_vs_plan(
  p_bucket_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  bucket_name TEXT,
  plan_name TEXT,
  current_month_start DATE,
  storage_gb DECIMAL,
  storage_limit_gb DECIMAL,
  storage_usage_percent DECIMAL,
  class_a_operations INTEGER,
  class_a_limit INTEGER,
  class_a_usage_percent DECIMAL,
  class_b_operations INTEGER,
  class_b_limit INTEGER,
  class_b_usage_percent DECIMAL,
  egress_gb DECIMAL,
  egress_limit_gb DECIMAL,
  egress_usage_percent DECIMAL,
  estimated_cost_usd DECIMAL,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    usage.bucket_name,
    config.plan_name,
    usage.current_month_start,
    ROUND((usage.storage_bytes / 1024.0 / 1024.0 / 1024.0)::DECIMAL, 2) as storage_gb,
    config.base_storage_gb as storage_limit_gb,
    ROUND(
      ((usage.storage_bytes / 1024.0 / 1024.0 / 1024.0) / config.base_storage_gb * 100)::DECIMAL, 2
    ) as storage_usage_percent,
    usage.class_a_operations,
    config.base_class_a_operations as class_a_limit,
    ROUND(
      (usage.class_a_operations::DECIMAL / config.base_class_a_operations * 100), 2
    ) as class_a_usage_percent,
    usage.class_b_operations,
    config.base_class_b_operations as class_b_limit,
    ROUND(
      (usage.class_b_operations::DECIMAL / config.base_class_b_operations * 100), 2
    ) as class_b_usage_percent,
    ROUND((usage.egress_bytes / 1024.0 / 1024.0 / 1024.0)::DECIMAL, 2) as egress_gb,
    config.base_egress_gb as egress_limit_gb,
    ROUND(
      ((usage.egress_bytes / 1024.0 / 1024.0 / 1024.0) / config.base_egress_gb * 100)::DECIMAL, 2
    ) as egress_usage_percent,
    usage.estimated_cost_usd,
    EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day') - CURRENT_DATE)::INTEGER as days_remaining
  FROM public.r2_current_usage usage
  CROSS JOIN public.r2_plan_config config
  WHERE config.is_active = true
    AND (p_bucket_name IS NULL OR usage.bucket_name = p_bucket_name)
    AND usage.current_month_start = date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: get_r2_usage_stats function (BIGINT casting)
DROP FUNCTION IF EXISTS get_r2_usage_stats(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION get_r2_usage_stats(
  p_bucket_name TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT now() - interval '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
  bucket_name TEXT,
  total_requests BIGINT,
  total_bytes_transferred BIGINT,
  total_cost_usd DECIMAL,
  get_requests BIGINT,
  put_requests BIGINT,
  delete_requests BIGINT,
  head_requests BIGINT,
  list_requests BIGINT,
  avg_response_size BIGINT,
  requests_by_day JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    logs.bucket_name,
    SUM(logs.request_count)::BIGINT as total_requests,
    SUM(logs.bytes_transferred)::BIGINT as total_bytes_transferred,
    SUM(logs.cost_usd) as total_cost_usd,
    SUM(CASE WHEN logs.operation_type = 'GET' THEN logs.request_count ELSE 0 END)::BIGINT as get_requests,
    SUM(CASE WHEN logs.operation_type = 'PUT' THEN logs.request_count ELSE 0 END)::BIGINT as put_requests,
    SUM(CASE WHEN logs.operation_type = 'DELETE' THEN logs.request_count ELSE 0 END)::BIGINT as delete_requests,
    SUM(CASE WHEN logs.operation_type = 'HEAD' THEN logs.request_count ELSE 0 END)::BIGINT as head_requests,
    SUM(CASE WHEN logs.operation_type = 'LIST' THEN logs.request_count ELSE 0 END)::BIGINT as list_requests,
    ROUND(AVG(logs.bytes_transferred))::BIGINT as avg_response_size,
    COALESCE(
      jsonb_object_agg(
        date_trunc('day', logs.created_at)::text, 
        daily_stats.daily_count
      ) FILTER (WHERE daily_stats.daily_count IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_day
  FROM public.r2_usage_logs logs
  LEFT JOIN (
    SELECT 
      daily_logs.bucket_name,
      date_trunc('day', daily_logs.created_at) as day,
      SUM(daily_logs.request_count) as daily_count
    FROM public.r2_usage_logs daily_logs
    WHERE (p_bucket_name IS NULL OR daily_logs.bucket_name = p_bucket_name)
      AND daily_logs.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY daily_logs.bucket_name, date_trunc('day', daily_logs.created_at)
  ) daily_stats ON logs.bucket_name = daily_stats.bucket_name AND date_trunc('day', logs.created_at) = daily_stats.day
  WHERE (p_bucket_name IS NULL OR logs.bucket_name = p_bucket_name)
    AND logs.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY logs.bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_r2_usage_vs_plan(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_r2_usage_stats(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Test both functions
SELECT 'Testing get_r2_usage_vs_plan...' as test_step;
SELECT * FROM get_r2_usage_vs_plan();

SELECT 'Testing get_r2_usage_stats...' as test_step;
SELECT * FROM get_r2_usage_stats();

-- Insert comprehensive test data
INSERT INTO public.r2_usage_logs (
  bucket_name,
  operation_type,
  bytes_transferred,
  request_count,
  cost_usd,
  region,
  user_agent
) VALUES 
  ('statpedia-player-props-cache', 'GET', 1024, 1, 0.001, 'auto', 'test-agent'),
  ('statpedia-player-props-cache', 'PUT', 2048, 1, 0.002, 'auto', 'test-agent'),
  ('statpedia-player-props-cache', 'GET', 512, 1, 0.0005, 'auto', 'test-agent'),
  ('statpedia-player-props-cache', 'DELETE', 0, 1, 0.0001, 'auto', 'test-agent'),
  ('statpedia-player-props-cache', 'HEAD', 0, 1, 0.0001, 'auto', 'test-agent'),
  ('statpedia-player-props-cache', 'LIST', 0, 1, 0.0001, 'auto', 'test-agent')
ON CONFLICT DO NOTHING;

-- Test functions with comprehensive data
SELECT 'Testing with comprehensive data...' as test_step;
SELECT * FROM get_r2_usage_stats('statpedia-player-props-cache');
SELECT * FROM get_r2_usage_vs_plan('statpedia-player-props-cache');

-- Verify current usage tracking was updated
SELECT 'Current usage tracking:' as test_step;
SELECT * FROM public.r2_current_usage;

-- Verify plan configuration
SELECT 'Plan configuration:' as test_step;
SELECT * FROM public.r2_plan_config;
