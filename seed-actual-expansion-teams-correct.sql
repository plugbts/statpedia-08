-- Actual 2025 Expansion Teams for StatPedia
-- Adding only the real expansion teams

-- Add Golden State Valkyries to WNBA (2025 expansion)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Golden State Valkyries', 'GSV', 'https://a.espncdn.com/i/teamlogos/wnba/500/gsv.png'
FROM leagues 
WHERE code = 'WNBA' AND NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'WNBA' AND t.abbreviation = 'GSV'
);

-- Add Utah Mammoth to NHL (2025 expansion)  
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Utah Mammoth', 'UTA', 'https://a.espncdn.com/i/teamlogos/nhl/500/uta.png'
FROM leagues 
WHERE code = 'NHL' AND NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'NHL' AND t.abbreviation = 'UTA'
);

-- Summary query to show updated counts
SELECT 
  l.code as league,
  l.name as league_name,
  COUNT(t.id) as team_count
FROM leagues l 
LEFT JOIN teams t ON l.id = t.league_id 
GROUP BY l.code, l.name 
ORDER BY team_count DESC;
