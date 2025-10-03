-- Quick fix for usage monitors - create minimal required tables and functions

-- Create api_usage_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  sport TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  api_key_used TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_plan_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_plan_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  monthly_request_limit INTEGER NOT NULL DEFAULT 1000,
  cost_per_request_usd DECIMAL(10,6) NOT NULL DEFAULT 0.001,
  cache_hit_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_current_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_current_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_month_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
  total_requests INTEGER DEFAULT 0,
  total_response_time_ms BIGINT DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  requests_by_endpoint JSONB DEFAULT '{}',
  requests_by_sport JSONB DEFAULT '{}',
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, current_month_start)
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_current_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own API usage logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Admins can view all API usage logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Admins can manage API plan config" ON public.api_plan_config;
DROP POLICY IF EXISTS "Users can view their own current usage" ON public.api_current_usage;
DROP POLICY IF EXISTS "Admins can view all current usage" ON public.api_current_usage;

CREATE POLICY "Users can view their own API usage logs" 
ON public.api_usage_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all API usage logs" 
ON public.api_usage_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

CREATE POLICY "Admins can manage API plan config" 
ON public.api_plan_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

CREATE POLICY "Users can view their own current usage" 
ON public.api_current_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all current usage" 
ON public.api_current_usage 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
  )
);

-- Insert default API plan configurations
INSERT INTO public.api_plan_config (
  plan_name, 
  monthly_request_limit, 
  cost_per_request_usd, 
  cache_hit_discount_percent
) VALUES 
('Free Tier', 1000, 0.001, 0),
('Basic', 10000, 0.0008, 10),
('Pro', 50000, 0.0006, 20),
('Enterprise', 200000, 0.0004, 30)
ON CONFLICT (plan_name) DO NOTHING;

-- Create the required functions
CREATE OR REPLACE FUNCTION get_sportsgameodds_api_usage_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  total_requests BIGINT,
  total_response_time_ms BIGINT,
  avg_response_time_ms NUMERIC,
  cache_hit_rate NUMERIC,
  requests_by_endpoint JSONB,
  requests_by_sport JSONB,
  total_cost_usd NUMERIC,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    logs.user_id,
    COUNT(*) as total_requests,
    SUM(logs.response_time_ms) as total_response_time_ms,
    ROUND(AVG(logs.response_time_ms), 2) as avg_response_time_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE logs.cache_hit = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2
    ) as cache_hit_rate,
    COALESCE(
      jsonb_object_agg(
        logs.endpoint, 
        endpoint_count
      ) FILTER (WHERE logs.endpoint IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_endpoint,
    COALESCE(
      jsonb_object_agg(
        logs.sport, 
        sport_count
      ) FILTER (WHERE logs.sport IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_sport,
    ROUND(COUNT(*) * 0.001, 6) as total_cost_usd,
    ROUND(
      (COUNT(*) FILTER (WHERE logs.response_status >= 400)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2
    ) as error_rate
  FROM public.api_usage_logs logs
  LEFT JOIN (
    SELECT 
      endpoint,
      COUNT(*) as endpoint_count
    FROM public.api_usage_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND created_at BETWEEN COALESCE(p_start_date, now() - interval '30 days') AND COALESCE(p_end_date, now())
    GROUP BY endpoint
  ) endpoint_stats ON logs.endpoint = endpoint_stats.endpoint
  LEFT JOIN (
    SELECT 
      sport,
      COUNT(*) as sport_count
    FROM public.api_usage_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND created_at BETWEEN COALESCE(p_start_date, now() - interval '30 days') AND COALESCE(p_end_date, now())
      AND sport IS NOT NULL
    GROUP BY sport
  ) sport_stats ON logs.sport = sport_stats.sport
  WHERE (p_user_id IS NULL OR logs.user_id = p_user_id)
    AND logs.created_at BETWEEN COALESCE(p_start_date, now() - interval '30 days') AND COALESCE(p_end_date, now())
  GROUP BY logs.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_sportsgameodds_api_usage_vs_plan(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  plan_name TEXT,
  current_month_start DATE,
  total_requests INTEGER,
  request_limit INTEGER,
  usage_percent NUMERIC,
  cache_hit_rate NUMERIC,
  estimated_cost_usd NUMERIC,
  projected_monthly_cost NUMERIC,
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
      (usage.total_requests::NUMERIC / config.monthly_request_limit) * 100, 2
    ) as usage_percent,
    ROUND(
      (usage.cache_hits::NUMERIC / NULLIF(usage.cache_hits + usage.cache_misses, 0)) * 100, 2
    ) as cache_hit_rate,
    usage.estimated_cost_usd,
    ROUND(
      (usage.estimated_cost_usd / EXTRACT(DAY FROM CURRENT_DATE)) * 
      EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')), 6
    ) as projected_monthly_cost,
    EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day') - CURRENT_DATE)::INTEGER as days_remaining,
    CASE 
      WHEN (usage.total_requests::NUMERIC / config.monthly_request_limit) > 0.9 THEN 
        ARRAY['Consider upgrading to a higher plan', 'Usage is approaching limit']
      WHEN (usage.total_requests::NUMERIC / config.monthly_request_limit) > 0.7 THEN 
        ARRAY['Monitor usage closely', 'Consider plan upgrade if trend continues']
      ELSE 
        ARRAY['Usage is within normal limits']
    END as recommendations
  FROM public.api_current_usage usage
  CROSS JOIN public.api_plan_config config
  WHERE config.is_active = true
    AND (p_user_id IS NULL OR usage.user_id = p_user_id)
    AND usage.current_month_start = date_trunc('month', CURRENT_DATE)::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_sportsgameodds_api_usage_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sportsgameodds_api_usage_vs_plan(UUID) TO authenticated;
