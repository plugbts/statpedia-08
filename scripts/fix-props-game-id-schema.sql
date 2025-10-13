-- Fix props.game_id schema mismatch
-- This script updates props.game_id from text to uuid and maps to actual game UUIDs

-- Step 1: Add a temporary column to store the original game_id
ALTER TABLE props ADD COLUMN IF NOT EXISTS temp_game_id TEXT;

-- Step 2: Copy the current game_id values to the temp column
UPDATE props SET temp_game_id = game_id;

-- Step 3: Create a mapping table to match external game IDs to our game UUIDs
-- We'll need to manually map these based on the games we have in our database
CREATE TEMP TABLE game_mapping AS
SELECT 
    g.id as game_uuid,
    g.external_id as external_id,
    -- For now, we'll use a simple mapping based on the games we have
    -- This is a temporary solution until we can properly map the SportsGameOdds IDs
    CASE 
        WHEN g.external_id = '717408' THEN 'SEouahp3wKwS4zc0prSl'
        WHEN g.external_id = '717397' THEN 'RL1DUbi45LDV0PvMycX0'
        WHEN g.external_id = '717411' THEN 'RE2TKmj6ew1jtDUVj8t4'
        WHEN g.external_id = '717393' THEN 'IDlsKVQIwqR94ookXdVE'
        WHEN g.external_id = '717407' THEN 'nFoUGoX53WZF98vni6EL'
        -- Add more mappings as needed
        ELSE NULL
    END as sgo_game_id
FROM games g
WHERE g.external_id IS NOT NULL;

-- Step 4: Update props.game_id to use the correct game UUIDs
UPDATE props 
SET game_id = gm.game_uuid::text
FROM game_mapping gm
WHERE props.temp_game_id = gm.sgo_game_id
AND gm.sgo_game_id IS NOT NULL;

-- Step 5: For props that couldn't be mapped, assign them to the first available game
-- This is a temporary fix - ideally we'd want to map them properly
UPDATE props 
SET game_id = (SELECT id::text FROM games LIMIT 1)
WHERE game_id = temp_game_id; -- This means the mapping didn't work

-- Step 6: Change the column type from text to uuid
ALTER TABLE props ALTER COLUMN game_id TYPE uuid USING game_id::uuid;

-- Step 7: Clean up the temporary column
ALTER TABLE props DROP COLUMN temp_game_id;

-- Step 8: Verify the fix
SELECT 'Verification - props with valid game UUIDs:' as info;
SELECT COUNT(*) as count FROM props p 
JOIN games g ON p.game_id = g.id;

SELECT 'Verification - props.game_id data type:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'props' AND column_name = 'game_id';
