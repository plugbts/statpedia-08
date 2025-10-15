-- Fix player foreign key mismatch by creating missing players
-- This creates players_canonical entries for all players referenced in game logs

-- 1. Create missing players from player_game_logs
INSERT INTO players_canonical (id, external_id, display_name, team_id, league, position)
SELECT DISTINCT
    pgl.player_id as id,
    pgl.player_id::text as external_id, -- Use the UUID as external_id for now
    'Player ' || SUBSTRING(pgl.player_id::text, 1, 8) as display_name, -- Generate a display name
    (SELECT id FROM teams_canonical WHERE league = 'nfl' LIMIT 1) as team_id, -- Default to first NFL team
    'nfl' as league, -- Default to NFL for now
    'Unknown' as position
FROM player_game_logs pgl
LEFT JOIN players_canonical p ON p.id = pgl.player_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Verify the fix
SELECT COUNT(*) as orphaned_player_logs
FROM player_game_logs pgl
LEFT JOIN players_canonical p ON p.id = pgl.player_id
WHERE p.id IS NULL;

-- 3. Check how many players we now have
SELECT COUNT(*) as total_players FROM players_canonical;

-- 4. Test that we can now join game logs with players
SELECT COUNT(*) as successful_player_joins
FROM player_game_logs pgl
JOIN players_canonical p ON p.id = pgl.player_id;
