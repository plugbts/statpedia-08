-- Fix RLS permissions for Edge Functions to read api_config

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'api_config';

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Admin and owner access to api_config" ON public.api_config;

-- Create a more permissive policy that allows service role to read
CREATE POLICY "Service role can read api_config" ON public.api_config
    FOR SELECT USING (true);

-- Also allow authenticated users to read (for Edge Functions)
CREATE POLICY "Authenticated users can read api_config" ON public.api_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Verify the table exists and has data
SELECT 'Table check' as test, 
       CASE WHEN EXISTS (SELECT 1 FROM api_config) THEN 'HAS_DATA' ELSE 'EMPTY' END as status;

-- Show what's actually in the table
SELECT key, 
       CASE 
         WHEN key = 'sportsgameodds_api_key' THEN LEFT(value::text, 10) || '...'
         ELSE value::text 
       END as value_preview
FROM api_config;
