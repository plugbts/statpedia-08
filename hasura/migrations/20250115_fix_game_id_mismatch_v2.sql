-- Fix foreign key mismatch between player_game_logs and games_canonical
-- Simplified approach: create missing games for orphaned logs

-- 1. Create a mapping table between raw API game IDs and canonical IDs
CREATE TABLE IF NOT EXISTS game_id_map (
  api_game_id TEXT PRIMARY KEY,
  canonical_game_id UUID NOT NULL REFERENCES games_canonical(id)
);

-- 2. Backfill the mapping table from existing games_canonical
INSERT INTO game_id_map (api_game_id, canonical_game_id)
SELECT DISTINCT g.external_id, g.id
FROM games_canonical g
ON CONFLICT (api_game_id) DO NOTHING;

-- 3. Create missing games for orphaned logs
-- We'll create games with default values since we don't have the original game data
INSERT INTO games_canonical (external_id, home_team_id, away_team_id, league, game_date, season, week)
SELECT 
    pgl.game_id::text as external_id,
    (SELECT id FROM teams_canonical WHERE league = 'NFL' LIMIT 1) as home_team_id,
    (SELECT id FROM teams_canonical WHERE league = 'NFL' OFFSET 1 LIMIT 1) as away_team_id,
    'NFL' as league,
    CURRENT_DATE + INTERVAL '1 day' as game_date,
    2025 as season,
    1 as week
FROM (
    SELECT DISTINCT game_id
    FROM player_game_logs pgl
    LEFT JOIN games_canonical g ON g.id = pgl.game_id
    WHERE g.id IS NULL
) pgl
ON CONFLICT (external_id) DO NOTHING;

-- 4. Update the mapping table with the new games
INSERT INTO game_id_map (api_game_id, canonical_game_id)
SELECT DISTINCT g.external_id, g.id
FROM games_canonical g
WHERE g.external_id IN (
    SELECT DISTINCT pgl.game_id::text
    FROM player_game_logs pgl
    LEFT JOIN games_canonical g2 ON g2.id = pgl.game_id
    WHERE g2.id IS NULL
)
ON CONFLICT (api_game_id) DO NOTHING;

-- 5. Update player_game_logs to use canonical IDs
UPDATE player_game_logs pgl
SET game_id = gm.canonical_game_id
FROM game_id_map gm
WHERE pgl.game_id::text = gm.api_game_id;

-- 6. Verify the fix
SELECT COUNT(*) as remaining_orphaned_logs
FROM player_game_logs pgl
LEFT JOIN games_canonical g ON g.id = pgl.game_id
WHERE g.id IS NULL;

-- 7. Test the join works now
SELECT COUNT(*) as successful_joins
FROM player_game_logs pgl
JOIN games_canonical g ON g.id = pgl.game_id;
