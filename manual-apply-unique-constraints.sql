-- Manual application of unique constraints migration
-- Run this directly in Supabase SQL Editor

-- Add unique constraint to player_game_logs table
DO $$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_player_game_log'
    ) THEN
        ALTER TABLE public.player_game_logs
        ADD CONSTRAINT unique_player_game_log
        UNIQUE (player_id, date, prop_type);
        
        RAISE NOTICE 'Added unique constraint to player_game_logs table';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on player_game_logs table';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.player_game_logs'::regclass 
AND conname = 'unique_player_game_log';
