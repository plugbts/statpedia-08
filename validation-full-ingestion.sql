-- Validation Queries for Full Ingestion
-- Run these after ingestion to verify data integrity

-- 1. Props with missing players
SELECT COUNT(*) as props_without_players
FROM props p
LEFT JOIN players pl ON p.player_id = pl.id
WHERE pl.id IS NULL;

-- 2. Props with missing teams  
SELECT COUNT(*) as props_without_teams
FROM props p
LEFT JOIN teams t ON p.team_id = t.id
WHERE t.id IS NULL;

-- 3. Total counts by league
SELECT 
  l.code as league,
  COUNT(DISTINCT t.id) as teams,
  COUNT(DISTINCT p.id) as players,
  COUNT(DISTINCT pr.id) as props
FROM leagues l
LEFT JOIN teams t ON l.id = t.league_id
LEFT JOIN players p ON t.id = p.team_id
LEFT JOIN props pr ON p.id = pr.player_id
GROUP BY l.id, l.code
ORDER BY l.code;

-- 4. Sample props with full relationships
SELECT 
  pr.prop_type, 
  pr.line, 
  pr.odds, 
  pl.name as player_name, 
  t.abbreviation as team_abbr, 
  l.code as league
FROM props pr
JOIN players pl ON pr.player_id = pl.id
JOIN teams t ON pr.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE pr.prop_type IS NOT NULL
LIMIT 20;

-- 5. Props by league and type
SELECT 
  l.code as league,
  pr.prop_type,
  COUNT(*) as count
FROM props pr
JOIN players pl ON pr.player_id = pl.id
JOIN teams t ON pr.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE pr.prop_type IS NOT NULL
GROUP BY l.code, pr.prop_type
ORDER BY l.code, count DESC;

-- 6. Recent props (last 24 hours)
SELECT 
  COUNT(*) as recent_props,
  COUNT(DISTINCT pr.player_id) as unique_players,
  COUNT(DISTINCT pr.team_id) as unique_teams
FROM props pr
WHERE pr.created_at > NOW() - INTERVAL '24 hours';

-- 7. Player coverage by league
SELECT 
  l.code as league,
  COUNT(DISTINCT pl.id) as total_players,
  COUNT(DISTINCT pr.player_id) as players_with_props,
  ROUND(
    COUNT(DISTINCT pr.player_id)::numeric / 
    NULLIF(COUNT(DISTINCT pl.id), 0) * 100, 2
  ) as coverage_percentage
FROM leagues l
LEFT JOIN teams t ON l.id = t.league_id
LEFT JOIN players pl ON t.id = pl.team_id
LEFT JOIN props pr ON pl.id = pr.player_id
GROUP BY l.id, l.code
ORDER BY coverage_percentage DESC;

-- 8. Most active players (by prop count)
SELECT 
  pl.name as player_name,
  t.abbreviation as team,
  l.code as league,
  COUNT(pr.id) as prop_count
FROM props pr
JOIN players pl ON pr.player_id = pl.id
JOIN teams t ON pr.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY pl.id, pl.name, t.abbreviation, l.code
ORDER BY prop_count DESC
LIMIT 20;

-- 9. Data quality check - null values
SELECT 
  'props' as table_name,
  COUNT(*) as total_rows,
  COUNT(player_id) as non_null_player_ids,
  COUNT(team_id) as non_null_team_ids,
  COUNT(prop_type) as non_null_prop_types,
  COUNT(line) as non_null_lines,
  COUNT(odds) as non_null_odds
FROM props

UNION ALL

SELECT 
  'players' as table_name,
  COUNT(*) as total_rows,
  COUNT(team_id) as non_null_team_ids,
  COUNT(name) as non_null_names,
  COUNT(position) as non_null_positions,
  COUNT(status) as non_null_status,
  NULL as non_null_odds
FROM players

UNION ALL

SELECT 
  'teams' as table_name,
  COUNT(*) as total_rows,
  COUNT(league_id) as non_null_league_ids,
  COUNT(name) as non_null_names,
  COUNT(abbreviation) as non_null_abbreviations,
  COUNT(logo_url) as non_null_logo_urls,
  NULL as non_null_odds
FROM teams;
