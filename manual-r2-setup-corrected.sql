-- Manual R2 Usage Tracking Setup (CORRECTED)
-- Run this SQL in your Supabase SQL Editor to set up R2 usage tracking

-- R2 Usage Logs Table
CREATE TABLE IF NOT EXISTS public.r2_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('GET', 'PUT', 'DELETE', 'HEAD', 'LIST')),
  bytes_transferred BIGINT DEFAULT 0,
  request_count INTEGER DEFAULT 1,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  region TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- R2 Usage Summary Table (daily aggregations)
CREATE TABLE IF NOT EXISTS public.r2_usage_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_name TEXT NOT NULL,
  usage_date DATE NOT NULL,
  total_requests BIGINT DEFAULT 0,
  total_bytes_transferred BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  get_requests BIGINT DEFAULT 0,
  put_requests BIGINT DEFAULT 0,
  delete_requests BIGINT DEFAULT 0,
  head_requests BIGINT DEFAULT 0,
  list_requests BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bucket_name, usage_date)
);

-- R2 Plan Configuration Table
CREATE TABLE IF NOT EXISTS public.r2_plan_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  base_storage_gb DECIMAL(10,2) NOT NULL DEFAULT 10,
  base_class_a_operations INTEGER NOT NULL DEFAULT 1000000,
  base_class_b_operations INTEGER NOT NULL DEFAULT 10000000,
  base_egress_gb DECIMAL(10,2) NOT NULL DEFAULT 1,
  storage_price_per_gb DECIMAL(10,6) NOT NULL DEFAULT 0.015,
  class_a_price_per_million DECIMAL(10,6) NOT NULL DEFAULT 4.5,
  class_b_price_per_million DECIMAL(10,6) NOT NULL DEFAULT 0.36,
  egress_price_per_gb DECIMAL(10,6) NOT NULL DEFAULT 0.09,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- R2 Current Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.r2_current_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_name TEXT NOT NULL UNIQUE,
  current_month_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
  storage_bytes BIGINT DEFAULT 0,
  class_a_operations INTEGER DEFAULT 0,
  class_b_operations INTEGER DEFAULT 0,
  egress_bytes BIGINT DEFAULT 0,
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_r2_usage_logs_bucket_name ON public.r2_usage_logs(bucket_name);
CREATE INDEX IF NOT EXISTS idx_r2_usage_logs_created_at ON public.r2_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_r2_usage_logs_operation_type ON public.r2_usage_logs(operation_type);

CREATE INDEX IF NOT EXISTS idx_r2_usage_summary_bucket_date ON public.r2_usage_summary(bucket_name, usage_date);
CREATE INDEX IF NOT EXISTS idx_r2_usage_summary_usage_date ON public.r2_usage_summary(usage_date);

CREATE INDEX IF NOT EXISTS idx_r2_current_usage_bucket_name ON public.r2_current_usage(bucket_name);
CREATE INDEX IF NOT EXISTS idx_r2_current_usage_month_start ON public.r2_current_usage(current_month_start);

-- Enable RLS on all tables
ALTER TABLE public.r2_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r2_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r2_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.r2_current_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for r2_usage_logs (admin only)
CREATE POLICY "Admins can view all R2 usage logs" 
ON public.r2_usage_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- RLS Policies for r2_usage_summary (admin only)
CREATE POLICY "Admins can view all R2 usage summary" 
ON public.r2_usage_summary 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- RLS Policies for r2_plan_config (admin only)
CREATE POLICY "Admins can manage R2 plan config" 
ON public.r2_plan_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- RLS Policies for r2_current_usage (admin only)
CREATE POLICY "Admins can view all R2 current usage" 
ON public.r2_current_usage 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- Insert default R2 plan configuration (Free tier)
INSERT INTO public.r2_plan_config (
  plan_name, 
  base_storage_gb, 
  base_class_a_operations, 
  base_class_b_operations, 
  base_egress_gb,
  storage_price_per_gb,
  class_a_price_per_million,
  class_b_price_per_million,
  egress_price_per_gb
) VALUES (
  'Free Tier',
  10.0,  -- 10 GB free storage
  1000000,  -- 1M Class A operations free
  10000000, -- 10M Class B operations free
  1.0,   -- 1 GB free egress
  0.015, -- $0.015 per GB storage
  4.5,   -- $4.5 per million Class A operations
  0.36,  -- $0.36 per million Class B operations
  0.09   -- $0.09 per GB egress
) ON CONFLICT (plan_name) DO NOTHING;

-- Function to log R2 usage
CREATE OR REPLACE FUNCTION log_r2_usage(
  p_bucket_name TEXT,
  p_operation_type TEXT,
  p_bytes_transferred BIGINT DEFAULT 0,
  p_request_count INTEGER DEFAULT 1,
  p_cost_usd DECIMAL DEFAULT 0,
  p_region TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.r2_usage_logs (
    bucket_name,
    operation_type,
    bytes_transferred,
    request_count,
    cost_usd,
    region,
    user_agent,
    ip_address
  ) VALUES (
    p_bucket_name,
    p_operation_type,
    p_bytes_transferred,
    p_request_count,
    p_cost_usd,
    p_region,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO log_id;
  
  -- Update current usage tracking
  INSERT INTO public.r2_current_usage (
    bucket_name,
    storage_bytes,
    class_a_operations,
    class_b_operations,
    egress_bytes,
    estimated_cost_usd
  ) VALUES (
    p_bucket_name,
    CASE WHEN p_operation_type = 'PUT' THEN p_bytes_transferred ELSE 0 END,
    CASE WHEN p_operation_type IN ('PUT', 'DELETE') THEN p_request_count ELSE 0 END,
    CASE WHEN p_operation_type IN ('GET', 'HEAD', 'LIST') THEN p_request_count ELSE 0 END,
    CASE WHEN p_operation_type = 'GET' THEN p_bytes_transferred ELSE 0 END,
    p_cost_usd
  )
  ON CONFLICT (bucket_name) DO UPDATE SET
    storage_bytes = CASE 
      WHEN p_operation_type = 'PUT' THEN r2_current_usage.storage_bytes + p_bytes_transferred
      WHEN p_operation_type = 'DELETE' THEN GREATEST(0, r2_current_usage.storage_bytes - p_bytes_transferred)
      ELSE r2_current_usage.storage_bytes
    END,
    class_a_operations = r2_current_usage.class_a_operations + 
      CASE WHEN p_operation_type IN ('PUT', 'DELETE') THEN p_request_count ELSE 0 END,
    class_b_operations = r2_current_usage.class_b_operations + 
      CASE WHEN p_operation_type IN ('GET', 'HEAD', 'LIST') THEN p_request_count ELSE 0 END,
    egress_bytes = r2_current_usage.egress_bytes + 
      CASE WHEN p_operation_type = 'GET' THEN p_bytes_transferred ELSE 0 END,
    estimated_cost_usd = r2_current_usage.estimated_cost_usd + p_cost_usd,
    last_updated = now();
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get R2 usage statistics
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
    SUM(logs.request_count) as total_requests,
    SUM(logs.bytes_transferred) as total_bytes_transferred,
    SUM(logs.cost_usd) as total_cost_usd,
    SUM(CASE WHEN logs.operation_type = 'GET' THEN logs.request_count ELSE 0 END) as get_requests,
    SUM(CASE WHEN logs.operation_type = 'PUT' THEN logs.request_count ELSE 0 END) as put_requests,
    SUM(CASE WHEN logs.operation_type = 'DELETE' THEN logs.request_count ELSE 0 END) as delete_requests,
    SUM(CASE WHEN logs.operation_type = 'HEAD' THEN logs.request_count ELSE 0 END) as head_requests,
    SUM(CASE WHEN logs.operation_type = 'LIST' THEN logs.request_count ELSE 0 END) as list_requests,
    ROUND(AVG(logs.bytes_transferred)) as avg_response_size,
    COALESCE(
      jsonb_object_agg(
        date_trunc('day', logs.created_at)::text, 
        daily_count
      ) FILTER (WHERE daily_count IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_day
  FROM public.r2_usage_logs logs
  LEFT JOIN (
    SELECT 
      bucket_name,
      date_trunc('day', created_at) as day,
      SUM(request_count) as daily_count
    FROM public.r2_usage_logs
    WHERE (p_bucket_name IS NULL OR bucket_name = p_bucket_name)
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY bucket_name, date_trunc('day', created_at)
  ) daily ON logs.bucket_name = daily.bucket_name AND date_trunc('day', logs.created_at) = daily.day
  WHERE (p_bucket_name IS NULL OR logs.bucket_name = p_bucket_name)
    AND logs.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY logs.bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current month usage vs plan limits
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
  class_a_operations BIGINT,
  class_a_limit BIGINT,
  class_a_usage_percent DECIMAL,
  class_b_operations BIGINT,
  class_b_limit BIGINT,
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
GRANT EXECUTE ON FUNCTION log_r2_usage(TEXT, TEXT, BIGINT, INTEGER, DECIMAL, TEXT, TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION get_r2_usage_stats(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_r2_usage_vs_plan(TEXT) TO authenticated;
