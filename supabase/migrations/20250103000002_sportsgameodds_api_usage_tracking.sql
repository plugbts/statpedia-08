-- SportsGameOdds API Usage Tracking Migration
-- Creates tables and functions for monitoring SportsGameOdds API usage

-- API Plan Configuration Table
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

-- API Current Usage Table
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

-- API Usage Summary Table
CREATE TABLE IF NOT EXISTS public.api_usage_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_month_start DATE NOT NULL,
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_plan_config_plan_name ON public.api_plan_config(plan_name);
CREATE INDEX IF NOT EXISTS idx_api_plan_config_is_active ON public.api_plan_config(is_active);

CREATE INDEX IF NOT EXISTS idx_api_current_usage_user_id ON public.api_current_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_current_usage_month_start ON public.api_current_usage(current_month_start);

CREATE INDEX IF NOT EXISTS idx_api_usage_summary_user_id ON public.api_usage_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_summary_month_start ON public.api_usage_summary(current_month_start);

-- Enable RLS on all tables
ALTER TABLE public.api_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_current_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_plan_config (admin only)
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

-- RLS Policies for api_current_usage (users can see their own, admins can see all)
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

-- RLS Policies for api_usage_summary (users can see their own, admins can see all)
CREATE POLICY "Users can view their own usage summary" 
ON public.api_usage_summary 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage summary" 
ON public.api_usage_summary 
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

-- Function to log SportsGameOdds API usage
CREATE OR REPLACE FUNCTION log_sportsgameodds_api_usage(
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT DEFAULT 'GET',
  p_sport TEXT DEFAULT NULL,
  p_response_status INTEGER,
  p_response_time_ms INTEGER,
  p_cache_hit BOOLEAN DEFAULT false,
  p_api_key_used TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  current_month_start DATE;
BEGIN
  -- Log the usage
  INSERT INTO public.api_usage_logs (
    user_id,
    endpoint,
    method,
    sport,
    response_status,
    response_time_ms,
    cache_hit,
    api_key_used,
    user_agent,
    ip_address
  ) VALUES (
    p_user_id,
    p_endpoint,
    p_method,
    p_sport,
    p_response_status,
    p_response_time_ms,
    p_cache_hit,
    p_api_key_used,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO log_id;
  
  -- Update current usage tracking
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  INSERT INTO public.api_current_usage (
    user_id,
    current_month_start,
    total_requests,
    total_response_time_ms,
    cache_hits,
    cache_misses,
    requests_by_endpoint,
    requests_by_sport,
    estimated_cost_usd
  ) VALUES (
    p_user_id,
    current_month_start,
    1,
    p_response_time_ms,
    CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    CASE WHEN p_cache_hit THEN 0 ELSE 1 END,
    jsonb_build_object(p_endpoint, 1),
    CASE WHEN p_sport IS NOT NULL THEN jsonb_build_object(p_sport, 1) ELSE '{}'::jsonb END,
    0.001 -- Default cost per request
  )
  ON CONFLICT (user_id, current_month_start) DO UPDATE SET
    total_requests = api_current_usage.total_requests + 1,
    total_response_time_ms = api_current_usage.total_response_time_ms + p_response_time_ms,
    cache_hits = api_current_usage.cache_hits + CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    cache_misses = api_current_usage.cache_misses + CASE WHEN p_cache_hit THEN 0 ELSE 1 END,
    requests_by_endpoint = COALESCE(api_current_usage.requests_by_endpoint, '{}'::jsonb) || 
      jsonb_build_object(p_endpoint, COALESCE((api_current_usage.requests_by_endpoint->>p_endpoint)::integer, 0) + 1),
    requests_by_sport = CASE 
      WHEN p_sport IS NOT NULL THEN 
        COALESCE(api_current_usage.requests_by_sport, '{}'::jsonb) || 
        jsonb_build_object(p_sport, COALESCE((api_current_usage.requests_by_sport->>p_sport)::integer, 0) + 1)
      ELSE api_current_usage.requests_by_sport
    END,
    estimated_cost_usd = api_current_usage.estimated_cost_usd + 0.001,
    updated_at = now();
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get SportsGameOdds API usage statistics
CREATE OR REPLACE FUNCTION get_sportsgameodds_api_usage_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT now() - interval '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
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
    ROUND(COUNT(*) * 0.001, 6) as total_cost_usd, -- Default cost calculation
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
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY endpoint
  ) endpoint_stats ON logs.endpoint = endpoint_stats.endpoint
  LEFT JOIN (
    SELECT 
      sport,
      COUNT(*) as sport_count
    FROM public.api_usage_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND created_at BETWEEN p_start_date AND p_end_date
      AND sport IS NOT NULL
    GROUP BY sport
  ) sport_stats ON logs.sport = sport_stats.sport
  WHERE (p_user_id IS NULL OR logs.user_id = p_user_id)
    AND logs.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY logs.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API usage vs plan
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
GRANT EXECUTE ON FUNCTION log_sportsgameodds_api_usage(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, TEXT, TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sportsgameodds_api_usage_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sportsgameodds_api_usage_vs_plan(UUID) TO authenticated;
