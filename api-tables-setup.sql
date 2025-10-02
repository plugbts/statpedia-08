-- Step-by-step API Usage Tracking Setup
-- This ensures tables are created before functions that reference them

-- Step 1: Create API usage tracking tables
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  sport TEXT,
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  api_key_used TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_usage_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  current_month_start DATE NOT NULL,
  total_requests BIGINT NOT NULL DEFAULT 0,
  total_response_time_ms BIGINT NOT NULL DEFAULT 0,
  cache_hits BIGINT NOT NULL DEFAULT 0,
  cache_misses BIGINT NOT NULL DEFAULT 0,
  requests_by_endpoint JSONB NOT NULL DEFAULT '{}',
  requests_by_sport JSONB NOT NULL DEFAULT '{}',
  estimated_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, current_month_start)
);

CREATE TABLE IF NOT EXISTS public.api_plan_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  monthly_request_limit BIGINT NOT NULL,
  cost_per_request_usd DECIMAL(8,6) NOT NULL,
  cache_hit_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_current_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  current_month_start DATE NOT NULL,
  total_requests BIGINT NOT NULL DEFAULT 0,
  total_response_time_ms BIGINT NOT NULL DEFAULT 0,
  cache_hits BIGINT NOT NULL DEFAULT 0,
  cache_misses BIGINT NOT NULL DEFAULT 0,
  requests_by_endpoint JSONB NOT NULL DEFAULT '{}',
  requests_by_sport JSONB NOT NULL DEFAULT '{}',
  estimated_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, current_month_start)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON public.api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_sport ON public.api_usage_logs(sport);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_response_status ON public.api_usage_logs(response_status);

CREATE INDEX IF NOT EXISTS idx_api_usage_summary_user_month ON public.api_usage_summary(user_id, current_month_start);
CREATE INDEX IF NOT EXISTS idx_api_current_usage_user_month ON public.api_current_usage(user_id, current_month_start);

-- Step 3: Enable RLS and create policies
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_current_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin access to api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "Admin access to api_usage_summary" ON public.api_usage_summary;
DROP POLICY IF EXISTS "Admin access to api_plan_config" ON public.api_plan_config;
DROP POLICY IF EXISTS "Admin access to api_current_usage" ON public.api_current_usage;

-- Create admin-only policies for all tables
CREATE POLICY "Admin access to api_usage_logs" ON public.api_usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
    )
  );

CREATE POLICY "Admin access to api_usage_summary" ON public.api_usage_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
    )
  );

CREATE POLICY "Admin access to api_plan_config" ON public.api_plan_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
    )
  );

CREATE POLICY "Admin access to api_current_usage" ON public.api_current_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND (subscription_tier = 'admin' OR subscription_tier = 'owner')
    )
  );

-- Step 4: Insert default API plan configurations
INSERT INTO public.api_plan_config (plan_name, monthly_request_limit, cost_per_request_usd, cache_hit_discount_percent) VALUES
  ('Free Tier', 1000, 0.001, 50),
  ('Basic', 10000, 0.0008, 60),
  ('Pro', 50000, 0.0006, 70),
  ('Enterprise', 200000, 0.0004, 80),
  ('Unlimited', 1000000, 0.0002, 90)
ON CONFLICT (plan_name) DO NOTHING;

-- Step 5: Verify tables exist
SELECT 'Verifying tables created...' as step;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'api_%'
ORDER BY table_name;

-- Step 6: Verify plan config data
SELECT 'Verifying plan config data...' as step;
SELECT plan_name, monthly_request_limit, cost_per_request_usd, cache_hit_discount_percent 
FROM public.api_plan_config 
ORDER BY monthly_request_limit;
