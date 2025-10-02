-- Final R2 Function Fix - All Type Issues Resolved
-- Run this to fix all remaining type mismatches

-- Fix: get_r2_usage_stats function (SUM type casting fix)
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
GRANT EXECUTE ON FUNCTION get_r2_usage_stats(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Test the function
SELECT 'Testing get_r2_usage_stats with type casting...' as test_step;
SELECT * FROM get_r2_usage_stats();

-- Insert some test data to verify functions work with data
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
  ('statpedia-player-props-cache', 'GET', 512, 1, 0.0005, 'auto', 'test-agent')
ON CONFLICT DO NOTHING;

-- Test functions with data
SELECT 'Testing with data...' as test_step;
SELECT * FROM get_r2_usage_stats('statpedia-player-props-cache');
SELECT * FROM get_r2_usage_vs_plan('statpedia-player-props-cache');
