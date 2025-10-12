-- Enhanced Prop Ingestion Validation Queries
-- Run these to verify the fixes are working

-- 1. Total props per league (should show full slate, not just 2)
SELECT 
  l.code as league,
  COUNT(p.id) as total_props,
  COUNT(DISTINCT p.player_id) as unique_players,
  COUNT(DISTINCT p.game_id) as unique_games
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, l.name
ORDER BY total_props DESC;

-- 2. Distinct prop types per league (should show specific names, not just "Yards")
SELECT 
  l.code as league,
  p.prop_type,
  COUNT(*) as count
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, p.prop_type
ORDER BY l.code, count DESC;

-- 3. Check for injured players (should be 0)
SELECT 
  l.code as league,
  pl.status,
  COUNT(*) as player_count
FROM players pl
JOIN teams t ON pl.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, pl.status
ORDER BY l.code, pl.status;

-- 4. Props by player status (should only show Active players)
SELECT 
  l.code as league,
  pl.status,
  COUNT(p.id) as prop_count
FROM props p
JOIN players pl ON p.player_id = pl.id
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, pl.status
ORDER BY l.code, pl.status;

-- 5. Sample props with full details
SELECT 
  l.code as league,
  t.abbreviation as team,
  pl.name as player_name,
  pl.position,
  pl.status as player_status,
  p.prop_type,
  p.line,
  p.odds,
  p.game_id
FROM props p
JOIN players pl ON p.player_id = pl.id
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
ORDER BY l.code, p.created_at DESC
LIMIT 20;

-- 6. Check for duplicate props (should be minimal due to conflict resolution)
SELECT 
  l.code as league,
  pl.name as player_name,
  p.prop_type,
  COUNT(*) as duplicate_count
FROM props p
JOIN players pl ON p.player_id = pl.id
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code, pl.name, p.prop_type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 7. Team coverage per league
SELECT 
  l.code as league,
  COUNT(DISTINCT t.id) as total_teams,
  COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN t.id END) as teams_with_props,
  ROUND(
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN t.id END) * 100.0 / 
    COUNT(DISTINCT t.id), 2
  ) as coverage_percentage
FROM teams t
JOIN leagues l ON t.league_id = l.id
LEFT JOIN props p ON p.team_id = t.id
GROUP BY l.code
ORDER BY coverage_percentage DESC;
