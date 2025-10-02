-- Simple Database Fix for API Management System
-- This script creates the required tables and inserts the API key

-- Step 1: Create api_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS on api_config
ALTER TABLE public.api_config ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy for admin/owner access (drop first if exists)
DROP POLICY IF EXISTS "Admin and owner access to api_config" ON public.api_config;
CREATE POLICY "Admin and owner access to api_config" ON public.api_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'owner')
        )
    );

-- Step 4: Insert or update the SportGameOdds API key
INSERT INTO public.api_config (key, value, description) 
VALUES (
    'sportsgameodds_api_key', 
    'd5dc1f00bc42133550bc1605dd8f457f',
    'API key for SportGameOdds service'
)
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 5: Create other required tables
CREATE TABLE IF NOT EXISTS public.api_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    endpoint VARCHAR(255) NOT NULL,
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS public.api_polling_status (
    id SERIAL PRIMARY KEY,
    service VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    last_poll TIMESTAMP WITH TIME ZONE,
    next_poll TIMESTAMP WITH TIME ZONE,
    poll_interval INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Enable RLS on all tables
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_polling_status ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies for other tables
DROP POLICY IF EXISTS "Admin access to api_cache" ON public.api_cache;
CREATE POLICY "Admin access to api_cache" ON public.api_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Admin access to api_usage_logs" ON public.api_usage_logs;
CREATE POLICY "Admin access to api_usage_logs" ON public.api_usage_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Admin access to api_rate_limits" ON public.api_rate_limits;
CREATE POLICY "Admin access to api_rate_limits" ON public.api_rate_limits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'owner')
        )
    );

DROP POLICY IF EXISTS "Admin access to api_polling_status" ON public.api_polling_status;
CREATE POLICY "Admin access to api_polling_status" ON public.api_polling_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'owner')
        )
    );

-- Step 8: Verify the setup
SELECT 'SUCCESS: API key configured' as result
WHERE EXISTS (
    SELECT 1 FROM api_config 
    WHERE key = 'sportsgameodds_api_key' 
    AND value = 'd5dc1f00bc42133550bc1605dd8f457f'
);
