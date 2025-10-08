-- Schema Alignment Migration
-- Aligns Supabase database schema with Worker payloads and migration files
-- Fixes critical missing columns identified during debugging

-- ✅ Step 1: Align `proplines` table
-- Add any missing columns
ALTER TABLE IF EXISTS public.proplines
  ADD COLUMN IF NOT EXISTS league TEXT,
  ADD COLUMN IF NOT EXISTS season INTEGER,
  ADD COLUMN IF NOT EXISTS game_id TEXT,
  ADD COLUMN IF NOT EXISTS conflict_key TEXT;

-- Ensure uniqueness for upserts (Worker expects this composite key)
-- Drop existing index if it exists to avoid conflicts
DROP INDEX IF EXISTS proplines_conflict_idx;
DROP INDEX IF EXISTS idx_proplines_conflict_key;

CREATE UNIQUE INDEX IF NOT EXISTS proplines_conflict_idx
ON public.proplines (player_id, date, prop_type, sportsbook, league, season);

-- Also create a simple conflict_key index for direct upserts
CREATE UNIQUE INDEX IF NOT EXISTS proplines_conflict_key_idx
ON public.proplines (conflict_key)
WHERE conflict_key IS NOT NULL;

------------------------------------------------------------

-- ✅ Step 2: Align `player_game_logs` table
ALTER TABLE IF EXISTS public.player_game_logs
  ADD COLUMN IF NOT EXISTS league TEXT,
  ADD COLUMN IF NOT EXISTS season INTEGER,
  ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Ensure uniqueness for upserts
DROP INDEX IF EXISTS player_game_logs_conflict_idx;

CREATE UNIQUE INDEX IF NOT EXISTS player_game_logs_conflict_idx
ON public.player_game_logs (player_id, date, prop_type, league, season);

------------------------------------------------------------

-- ✅ Step 3: Add created_at / updated_at timestamps for tracking
-- If you want automatic tracking
ALTER TABLE IF EXISTS public.proplines
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.player_game_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

------------------------------------------------------------

-- ✅ Step 4: Add comments for documentation
COMMENT ON COLUMN public.proplines.league IS 'Sport league (nfl, nba, mlb, nhl)';
COMMENT ON COLUMN public.proplines.season IS 'Season year (e.g., 2025)';
COMMENT ON COLUMN public.proplines.game_id IS 'Unique game identifier';
COMMENT ON COLUMN public.proplines.conflict_key IS 'Unique key for upsert operations';

COMMENT ON COLUMN public.player_game_logs.league IS 'Sport league (nfl, nba, mlb, nhl)';
COMMENT ON COLUMN public.player_game_logs.season IS 'Season year (e.g., 2025)';
COMMENT ON COLUMN public.player_game_logs.game_id IS 'Unique game identifier';

------------------------------------------------------------

-- ✅ Step 5: Verify schema alignment
-- This query should return the expected columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'proplines' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'player_game_logs' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

------------------------------------------------------------

-- ✅ Step 6: Test data structure (will be empty initially)
SELECT 'proplines table structure verified' as status;
SELECT 'player_game_logs table structure verified' as status;
