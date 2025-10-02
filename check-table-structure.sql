-- Check the actual structure of api_usage_logs table
SELECT 'Checking api_usage_logs table structure...' as step;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'api_usage_logs'
ORDER BY ordinal_position;

-- Check if the table exists and has any data
SELECT 'Checking if table exists and has data...' as step;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage_logs' AND table_schema = 'public') 
    THEN 'Table exists'
    ELSE 'Table does not exist'
  END as table_status;

-- If table exists, check its data
SELECT 'Sample data from api_usage_logs (if exists):' as step;
SELECT * FROM public.api_usage_logs LIMIT 5;
