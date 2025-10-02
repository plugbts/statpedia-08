-- Fix for get_r2_usage_vs_plan function - Type mismatch correction
-- Run this to fix the function return type issue

-- Drop the existing function
DROP FUNCTION IF EXISTS get_r2_usage_vs_plan(TEXT);

-- Recreate the function with correct return types
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
  class_a_operations INTEGER,  -- Changed from BIGINT to INTEGER
  class_a_limit INTEGER,       -- Changed from BIGINT to INTEGER
  class_a_usage_percent DECIMAL,
  class_b_operations INTEGER,  -- Changed from BIGINT to INTEGER
  class_b_limit INTEGER,       -- Changed from BIGINT to INTEGER
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_r2_usage_vs_plan(TEXT) TO authenticated;
