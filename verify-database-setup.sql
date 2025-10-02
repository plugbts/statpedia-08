-- Verify Database Setup for API Management System
-- Run this in Supabase SQL Editor to check if everything is configured

-- 1. Check if api_config table exists and has the API key
SELECT 'api_config table check' as test_name, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_config') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- 2. Check API key configuration (only if table exists)
SELECT 'API key check' as test_name,
       CASE 
         WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_config') 
         THEN 'TABLE_MISSING'
         WHEN EXISTS (SELECT 1 FROM api_config WHERE key = 'sportsgameodds_api_key' AND value IS NOT NULL AND value != '') 
         THEN 'CONFIGURED' 
         ELSE 'MISSING' 
       END as status;

-- 3. Show current API configuration (if exists)
SELECT key, 
       CASE 
         WHEN key = 'sportsgameodds_api_key' THEN CONCAT(LEFT(value, 8), '...', RIGHT(value, 4))
         ELSE value 
       END as value_preview,
       description,
       created_at
FROM api_config 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_config')
ORDER BY key;

-- 4. Check other required tables
SELECT table_name, 
       CASE 
         WHEN table_name IN ('api_config', 'api_cache', 'api_usage_logs', 'api_rate_limits', 'api_polling_status') 
         THEN 'REQUIRED' 
         ELSE 'OPTIONAL' 
       END as importance
FROM information_schema.tables 
WHERE table_name LIKE 'api_%' 
ORDER BY table_name;

-- 5. If api_config table is missing, create it and insert the API key
DO $$
BEGIN
    -- Create api_config table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_config') THEN
        CREATE TABLE public.api_config (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.api_config ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for admin/owner access
        CREATE POLICY "Admin and owner access to api_config" ON public.api_config
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_roles.user_id = auth.uid() 
                    AND user_roles.role IN ('admin', 'owner')
                )
            );
        
        RAISE NOTICE 'Created api_config table';
    END IF;
    
    -- Insert API key if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM api_config WHERE key = 'sportsgameodds_api_key') THEN
        INSERT INTO public.api_config (key, value, description) 
        VALUES (
            'sportsgameodds_api_key', 
            'd5dc1f00bc42133550bc1605dd8f457f',
            'API key for SportGameOdds service'
        );
        RAISE NOTICE 'Inserted SportGameOdds API key';
    END IF;
END $$;

-- 6. Final verification
SELECT 'FINAL CHECK' as test_name,
       CASE 
         WHEN EXISTS (
             SELECT 1 FROM api_config 
             WHERE key = 'sportsgameodds_api_key' 
             AND value = 'd5dc1f00bc42133550bc1605dd8f457f'
         ) 
         THEN '✅ SUCCESS - API key is configured correctly' 
         ELSE '❌ FAILED - API key is not configured' 
       END as result;
