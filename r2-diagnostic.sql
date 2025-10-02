-- R2 Usage Tracking Diagnostic Script
-- Run this in your Supabase SQL Editor to check what's missing

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('r2_usage_logs', 'r2_usage_summary', 'r2_plan_config', 'r2_current_usage')
ORDER BY table_name;

-- Check if functions exist
SELECT 
  routine_name,
  CASE 
    WHEN routine_name IS NOT NULL THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('log_r2_usage', 'get_r2_usage_stats', 'get_r2_usage_vs_plan')
ORDER BY routine_name;

-- Check if you have admin access (replace with your actual user ID)
SELECT 
  p.user_id,
  p.subscription_tier,
  CASE 
    WHEN p.subscription_tier IN ('admin', 'owner') THEN 'HAS ACCESS'
    ELSE 'NO ACCESS'
  END as access_status
FROM public.profiles p
WHERE p.user_id = auth.uid();

-- Test the get_r2_usage_vs_plan function (this will show the actual error)
SELECT * FROM get_r2_usage_vs_plan();
