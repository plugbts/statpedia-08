-- R2 Usage Tracking Test Script
-- Run this after completing the 7-step setup to test everything works

-- Test 1: Insert some sample usage data
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
  ('statpedia-player-props-cache', 'GET', 512, 1, 0.0005, 'auto', 'test-agent');

-- Test 2: Check if data was inserted
SELECT 
  bucket_name,
  operation_type,
  bytes_transferred,
  cost_usd,
  created_at
FROM public.r2_usage_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 3: Test the log_r2_usage function
SELECT log_r2_usage(
  'test-bucket',
  'GET',
  1024,
  1,
  0.001,
  'auto',
  'test-agent'
);

-- Test 4: Test the get_r2_usage_stats function
SELECT * FROM get_r2_usage_stats('statpedia-player-props-cache');

-- Test 5: Test the get_r2_usage_vs_plan function
SELECT * FROM get_r2_usage_vs_plan();

-- Test 6: Check current usage tracking
SELECT * FROM public.r2_current_usage;

-- Test 7: Check plan configuration
SELECT * FROM public.r2_plan_config;
