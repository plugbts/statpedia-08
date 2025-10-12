-- Validation queries for upcoming props ingestion
-- Run these in your Neon database to verify the results

-- 1. Check total props count by league
SELECT 
    l.code as league,
    l.name as league_name,
    COUNT(p.id) as total_props,
    COUNT(DISTINCT p.player_id) as unique_players,
    COUNT(DISTINCT p.game_id) as unique_games
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, l.name
ORDER BY total_props DESC;

-- 2. Check prop types by league
SELECT 
    l.code as league,
    p.prop_type,
    COUNT(*) as prop_count,
    AVG(CAST(p.line AS FLOAT)) as avg_line
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, p.prop_type
ORDER BY l.code, prop_count DESC;

-- 3. Check upcoming games (should show recent game_ids)
SELECT 
    l.code as league,
    p.game_id,
    COUNT(*) as props_count,
    MIN(p.created_at) as first_prop_created,
    MAX(p.created_at) as last_prop_created
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'  -- Recent props
GROUP BY l.code, p.game_id
ORDER BY l.code, props_count DESC;

-- 4. Check player coverage by league
SELECT 
    l.code as league,
    COUNT(DISTINCT p.player_id) as total_players,
    COUNT(DISTINCT CASE WHEN pl.status = 'Active' THEN p.player_id END) as active_players,
    COUNT(DISTINCT CASE WHEN pl.status IS NULL THEN p.player_id END) as unknown_status_players
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
LEFT JOIN players pl ON p.player_id = pl.id
GROUP BY l.code
ORDER BY total_players DESC;

-- 5. Check prop status distribution
SELECT 
    l.code as league,
    p.status,
    COUNT(*) as count
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, p.status
ORDER BY l.code, count DESC;

-- 6. Sample recent props by league
SELECT 
    l.code as league,
    pl.name as player_name,
    t.name as team_name,
    p.prop_type,
    p.line,
    p.odds,
    p.game_id,
    p.created_at
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
LEFT JOIN players pl ON p.player_id = pl.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'  -- Recent props
ORDER BY l.code, p.created_at DESC
LIMIT 20;

-- 7. Check for any data quality issues
SELECT 
    'Missing player names' as issue_type,
    COUNT(*) as count
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
LEFT JOIN players pl ON p.player_id = pl.id
WHERE pl.name IS NULL

UNION ALL

SELECT 
    'Missing team names' as issue_type,
    COUNT(*) as count
FROM props p
JOIN teams t ON p.team_id = t.id
WHERE t.name IS NULL

UNION ALL

SELECT 
    'Missing prop lines' as issue_type,
    COUNT(*) as count
FROM props p
WHERE p.line IS NULL

UNION ALL

SELECT 
    'Missing odds' as issue_type,
    COUNT(*) as count
FROM props p
WHERE p.odds IS NULL;

-- 8. Check conflict key uniqueness (should be 0 duplicates)
SELECT 
    conflict_key,
    COUNT(*) as duplicate_count
FROM props
WHERE conflict_key IS NOT NULL
GROUP BY conflict_key
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
