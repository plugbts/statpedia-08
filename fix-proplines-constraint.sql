-- Fix proplines table constraint to match RPC function expectations
-- This script adds the missing unique constraint that the bulk_upsert_proplines function needs

-- First, let's check what constraints currently exist on the proplines table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name='proplines' 
    AND tc.table_schema='public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Add the unique constraint that the RPC function expects
-- The RPC function uses: ON CONFLICT (player_id, date, prop_type, sportsbook, line)
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proplines'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%player_id, date, prop_type, sportsbook, line%'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE public.proplines 
        ADD CONSTRAINT proplines_unique_prop_constraint 
        UNIQUE (player_id, date, prop_type, sportsbook, line);
        
        RAISE NOTICE 'Added unique constraint to proplines table: (player_id, date, prop_type, sportsbook, line)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on proplines table';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.table_name='proplines' 
    AND tc.table_schema='public'
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

-- Test the RPC function with a simple test case
DO $$
DECLARE
    test_result record;
BEGIN
    -- Test with empty array first
    SELECT * INTO test_result FROM bulk_upsert_proplines('[]'::jsonb);
    RAISE NOTICE 'Test with empty array: inserted=%, updated=%, errors=%', 
        test_result.inserted_count, test_result.updated_count, test_result.error_count;
        
    -- Test with sample data
    SELECT * INTO test_result FROM bulk_upsert_proplines('[{
        "player_id": "TEST_CONSTRAINT_1",
        "player_name": "Test Constraint Player",
        "team": "TEST",
        "opponent": "OPP",
        "league": "nfl",
        "season": 2025,
        "game_id": "TEST_GAME_1",
        "date_normalized": "2025-01-10",
        "date": "2025-01-10",
        "prop_type": "test_constraint_prop",
        "line": 100.5,
        "over_odds": -110,
        "under_odds": -110,
        "odds": -110,
        "sportsbook": "SportsGameOdds",
        "conflict_key": "TEST_CONSTRAINT_1|2025-01-10|test_constraint_prop|SportsGameOdds|nfl|2025"
    }]'::jsonb);
    
    RAISE NOTICE 'Test with sample data: inserted=%, updated=%, errors=%', 
        test_result.inserted_count, test_result.updated_count, test_result.error_count;
        
    IF test_result.error_count > 0 THEN
        RAISE NOTICE 'Errors: %', test_result.errors;
    END IF;
END $$;
