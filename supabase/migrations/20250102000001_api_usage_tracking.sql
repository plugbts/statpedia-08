-- Create API usage tracking tables for server-side monitoring
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

-- Create API cache table for storing cached responses
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  sport TEXT,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API configuration table
CREATE TABLE IF NOT EXISTS public.api_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_duration_seconds INTEGER DEFAULT 60,
  max_requests INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON public.api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_sport ON public.api_usage_logs(sport);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON public.api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON public.api_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON public.api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_sport ON public.api_cache(sport);

CREATE INDEX IF NOT EXISTS idx_api_config_key ON public.api_config(key);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint ON public.api_rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start ON public.api_rate_limits(window_start);

-- Enable RLS on all tables
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs (admin only for full access, users can see their own)
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
    AND subscription_status = 'admin'
  )
);

-- RLS Policies for api_cache (service role only)
CREATE POLICY "Service role can manage cache" 
ON public.api_cache 
FOR ALL 
USING (auth.role() = 'service_role');

-- RLS Policies for api_config (admin only)
CREATE POLICY "Admins can manage API config" 
ON public.api_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'admin'
  )
);

-- RLS Policies for api_rate_limits (users can see their own, service role can manage)
CREATE POLICY "Users can view their own rate limits" 
ON public.api_rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits" 
ON public.api_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role');

-- Insert default API configuration
INSERT INTO public.api_config (key, value, description) VALUES
('sportsgameodds_api_key', '"d5dc1f00bc42133550bc1605dd8f457f"', 'SportGameOdds API key'),
('cache_ttl_seconds', '30', 'Default cache TTL in seconds'),
('polling_interval_seconds', '30', 'Background polling interval in seconds'),
('rate_limit_per_minute', '60', 'Default rate limit per user per minute'),
('max_props_per_request', '3', 'Maximum props returned per request for testing'),
('enabled_sports', '["nfl", "nba", "mlb", "nhl"]', 'List of enabled sports for polling')
ON CONFLICT (key) DO NOTHING;

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old API usage logs (keep last 30 days)
CREATE OR REPLACE FUNCTION clean_old_usage_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_usage_logs 
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get API usage statistics
CREATE OR REPLACE FUNCTION get_api_usage_stats(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now() - interval '24 hours',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
  total_requests BIGINT,
  unique_users BIGINT,
  cache_hit_rate NUMERIC,
  avg_response_time NUMERIC,
  requests_by_endpoint JSONB,
  requests_by_sport JSONB,
  requests_by_hour JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(
      (COUNT(*) FILTER (WHERE cache_hit = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2
    ) as cache_hit_rate,
    ROUND(AVG(response_time_ms), 2) as avg_response_time,
    COALESCE(
      jsonb_object_agg(endpoint, endpoint_count) FILTER (WHERE endpoint IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_endpoint,
    COALESCE(
      jsonb_object_agg(sport, sport_count) FILTER (WHERE sport IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_sport,
    COALESCE(
      jsonb_object_agg(hour_bucket, hour_count) FILTER (WHERE hour_bucket IS NOT NULL),
      '{}'::jsonb
    ) as requests_by_hour
  FROM (
    SELECT 
      endpoint,
      sport,
      cache_hit,
      response_time_ms,
      user_id,
      date_trunc('hour', created_at) as hour_bucket,
      COUNT(*) OVER (PARTITION BY endpoint) as endpoint_count,
      COUNT(*) OVER (PARTITION BY sport) as sport_count,
      COUNT(*) OVER (PARTITION BY date_trunc('hour', created_at)) as hour_count
    FROM public.api_usage_logs
    WHERE created_at BETWEEN start_date AND end_date
  ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
