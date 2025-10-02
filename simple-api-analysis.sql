-- Simple API Analysis Function (No Complex Queries)
-- This avoids column reference issues by using basic queries

-- First, let's see what we actually have
SELECT 'Checking what tables and columns exist...' as step;

-- Check if api_usage_logs exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage_logs' AND table_schema = 'public') 
    THEN 'api_usage_logs table exists'
    ELSE 'api_usage_logs table does not exist'
  END as table_status;

-- If it exists, show its structure
SELECT 'api_usage_logs columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'api_usage_logs'
ORDER BY ordinal_position;

-- Create a very simple analysis function
CREATE OR REPLACE FUNCTION get_simple_api_analysis()
RETURNS TABLE (
  total_logs BIGINT,
  unique_users BIGINT,
  total_requests BIGINT,
  cache_hits BIGINT,
  cache_misses BIGINT,
  error_requests BIGINT,
  avg_response_time DECIMAL
) AS $$
BEGIN
  -- Simple query that should work regardless of column names
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_logs,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE cache_hit = true)::BIGINT as cache_hits,
    COUNT(*) FILTER (WHERE cache_hit = false)::BIGINT as cache_misses,
    COUNT(*) FILTER (WHERE response_status >= 400)::BIGINT as error_requests,
    ROUND(AVG(response_time_ms), 2) as avg_response_time
  FROM public.api_usage_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_simple_api_analysis() TO authenticated;

-- Test the simple function
SELECT 'Testing simple analysis function...' as step;
SELECT * FROM get_simple_api_analysis();

-- Show some sample data
SELECT 'Sample data from api_usage_logs:' as step;
SELECT 
  user_id,
  endpoint,
  sport,
  response_status,
  response_time_ms,
  cache_hit
FROM public.api_usage_logs
ORDER BY id DESC
LIMIT 5;
