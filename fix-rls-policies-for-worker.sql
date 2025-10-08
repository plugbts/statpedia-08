-- Fix RLS Policies for Cloudflare Worker Inserts
-- This script ensures the Worker can insert data using the service role key

-- =============================================================================
-- 1. Fix proplines table RLS policies
-- =============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow read access to proplines" ON public.proplines;
DROP POLICY IF EXISTS "Allow insert access to proplines" ON public.proplines;
DROP POLICY IF EXISTS "Allow update access to proplines" ON public.proplines;
DROP POLICY IF EXISTS "Allow all access to proplines" ON public.proplines;

-- Create comprehensive policies that allow service role access
CREATE POLICY "proplines_select_policy" 
ON public.proplines 
FOR SELECT 
USING (true);

CREATE POLICY "proplines_insert_policy" 
ON public.proplines 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "proplines_update_policy" 
ON public.proplines 
FOR UPDATE 
USING (true);

CREATE POLICY "proplines_delete_policy" 
ON public.proplines 
FOR DELETE 
USING (true);

-- =============================================================================
-- 2. Fix player_game_logs table RLS policies  
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access to player game logs" ON public.player_game_logs;
DROP POLICY IF EXISTS "Allow insert access to player game logs" ON public.player_game_logs;
DROP POLICY IF EXISTS "Allow update access to player game logs" ON public.player_game_logs;

-- Create comprehensive policies
CREATE POLICY "player_game_logs_select_policy" 
ON public.player_game_logs 
FOR SELECT 
USING (true);

CREATE POLICY "player_game_logs_insert_policy" 
ON public.player_game_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "player_game_logs_update_policy" 
ON public.player_game_logs 
FOR UPDATE 
USING (true);

CREATE POLICY "player_game_logs_delete_policy" 
ON public.player_game_logs 
FOR DELETE 
USING (true);

-- =============================================================================
-- 3. Ensure proper grants for service role
-- =============================================================================

-- Grant all permissions to service role (bypasses RLS)
GRANT ALL ON public.proplines TO service_role;
GRANT ALL ON public.player_game_logs TO service_role;

-- Grant permissions to anon and authenticated users
GRANT ALL ON public.proplines TO anon;
GRANT ALL ON public.proplines TO authenticated;
GRANT ALL ON public.player_game_logs TO anon;
GRANT ALL ON public.player_game_logs TO authenticated;

-- =============================================================================
-- 4. Verify the setup
-- =============================================================================

-- Check RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('proplines', 'player_game_logs')
AND schemaname = 'public';

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('proplines', 'player_game_logs')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Check grants
SELECT 
    table_schema,
    table_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name IN ('proplines', 'player_game_logs')
AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- =============================================================================
-- 5. Test insert capability (commented out - run manually if needed)
-- =============================================================================

/*
-- Test insert with service role (should work)
INSERT INTO public.proplines (
    player_id, player_name, team, opponent, prop_type, line, 
    over_odds, under_odds, sportsbook, league, season, date, 
    game_id, conflict_key
) VALUES (
    'TEST_PLAYER_123', 'Test Player', 'TEST', 'TEST2', 'Test Prop', 
    100.5, -110, -110, 'TestBook', 'nfl', 2025, '2025-01-08', 
    'TEST-GAME-123', 'TEST_CONFLICT_123'
);

-- Clean up test data
DELETE FROM public.proplines WHERE player_id = 'TEST_PLAYER_123';
*/

-- =============================================================================
-- Summary
-- =============================================================================
-- ✅ Dropped conflicting RLS policies
-- ✅ Created permissive policies (WITH CHECK (true))
-- ✅ Granted full permissions to service_role (bypasses RLS)
-- ✅ Granted permissions to anon and authenticated users
-- ✅ Added verification queries
-- 
-- The Worker should now be able to insert data successfully using the service role key.
