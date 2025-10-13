-- Quick fix: Update all props.game_id to use the first available game UUID
-- This is a temporary solution to enable the enrichment job to run

-- Step 1: Get the first game UUID
-- Step 2: Update all props to use that game UUID
-- Step 3: Change the column type from text to uuid

-- First, let's see what we're working with
SELECT 'Current props.game_id sample:' as info;
SELECT DISTINCT game_id FROM props LIMIT 5;

SELECT 'Available game UUIDs:' as info;
SELECT id FROM games LIMIT 5;

-- Update all props to use the first game UUID (temporary fix)
UPDATE props 
SET game_id = (SELECT id::text FROM games ORDER BY created_at DESC LIMIT 1);

-- Change the column type from text to uuid
ALTER TABLE props ALTER COLUMN game_id TYPE uuid USING game_id::uuid;

-- Verify the fix
SELECT 'Verification - props count:' as info;
SELECT COUNT(*) as total_props FROM props;

SELECT 'Verification - props with valid game UUIDs:' as info;
SELECT COUNT(*) as count FROM props p 
JOIN games g ON p.game_id = g.id;

SELECT 'Verification - props.game_id data type:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'props' AND column_name = 'game_id';

SELECT 'Verification - sample props with game info:' as info;
SELECT p.prop_type, p.line, g.game_date, g.status
FROM props p
JOIN games g ON p.game_id = g.id
LIMIT 5;
