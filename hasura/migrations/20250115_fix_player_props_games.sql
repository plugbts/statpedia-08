-- Create missing games for player_props table
-- This ensures player_props can join with games_canonical

-- 1. Create missing games for player_props
INSERT INTO games_canonical (external_id, home_team_id, away_team_id, league, game_date, season, week)
SELECT DISTINCT
    pp.game_id::text as external_id,
    (SELECT id FROM teams_canonical WHERE league = 'nfl' LIMIT 1) as home_team_id,
    (SELECT id FROM teams_canonical WHERE league = 'nfl' OFFSET 1 LIMIT 1) as away_team_id,
    'nfl' as league,
    CURRENT_DATE + INTERVAL '1 day' as game_date,
    2025 as season,
    1 as week
FROM player_props pp
LEFT JOIN games_canonical g ON g.id = pp.game_id
WHERE g.id IS NULL
ON CONFLICT (external_id) DO NOTHING;

-- 2. Verify the fix
SELECT COUNT(*) as orphaned_player_props
FROM player_props pp
LEFT JOIN games_canonical g ON g.id = pp.game_id
WHERE g.id IS NULL;

-- 3. Test the join now works
SELECT COUNT(*) as successful_joins
FROM player_props pp
JOIN games_canonical g ON g.id = pp.game_id;
