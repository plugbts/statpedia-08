-- Fix props.game_id to reference games.id (UUID) instead of external string IDs
-- This will resolve the type mismatch between props.game_id (text) and games.id (uuid)

-- First, let's see what we're working with
SELECT 'Current props.game_id values:' as info;
SELECT DISTINCT game_id FROM props LIMIT 10;

SELECT 'Current games table:' as info;
SELECT id, external_id FROM games LIMIT 10;

-- Update props.game_id to use the UUID from games table
-- We need to match the old game_id values to games.external_id or find another mapping
UPDATE props 
SET game_id = g.id::text
FROM games g 
WHERE props.game_id = g.external_id::text;

-- Show how many rows were updated
SELECT 'Updated props with matching external_id:' as info;
SELECT COUNT(*) as updated_count FROM props WHERE game_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Show remaining unmapped rows
SELECT 'Remaining unmapped game_id values:' as info;
SELECT DISTINCT game_id FROM props WHERE game_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' LIMIT 10;
