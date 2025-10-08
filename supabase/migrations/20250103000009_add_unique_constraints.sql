-- Add unique constraints to ensure data integrity and prevent duplicates

-- Add unique constraint to player_game_logs table
-- This prevents duplicate game logs for the same player, date, and prop type
ALTER TABLE public.player_game_logs 
ADD CONSTRAINT unique_player_game_log 
UNIQUE (player_id, date, prop_type);

-- Add composite index for the unique constraint for better performance
CREATE INDEX IF NOT EXISTS idx_player_game_logs_unique 
ON public.player_game_logs (player_id, date, prop_type);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_player_game_log ON public.player_game_logs 
IS 'Ensures no duplicate game logs for the same player, date, and prop type';

-- Verify the proplines table has the correct unique constraint
-- The conflict_key should already be unique, but let's ensure it exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'proplines_conflict_key_key' 
        AND conrelid = 'public.proplines'::regclass
    ) THEN
        ALTER TABLE public.proplines 
        ADD CONSTRAINT proplines_conflict_key_key 
        UNIQUE (conflict_key);
    END IF;
END $$;

-- Add comment explaining the proplines constraint
COMMENT ON CONSTRAINT proplines_conflict_key_key ON public.proplines 
IS 'Ensures no duplicate prop lines with the same conflict key (player_id, prop_type, line, sportsbook, date)';

-- Create a function to clean up any existing duplicates before applying constraints
CREATE OR REPLACE FUNCTION cleanup_duplicate_game_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Remove duplicates from player_game_logs, keeping the most recent one
    WITH ranked_logs AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY player_id, date, prop_type 
                   ORDER BY created_at DESC, id DESC
               ) as rn
        FROM public.player_game_logs
    )
    DELETE FROM public.player_game_logs 
    WHERE id IN (
        SELECT id FROM ranked_logs WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up % duplicate game logs', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Run the cleanup function
SELECT cleanup_duplicate_game_logs();

-- Drop the cleanup function as it's no longer needed
DROP FUNCTION cleanup_duplicate_game_logs();
