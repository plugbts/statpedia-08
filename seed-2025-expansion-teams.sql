-- 2025 Expansion Teams Update for StatPedia
-- Adding missing expansion teams to bring us to current 2025 roster

-- Add Golden State Valkyries to WNBA (2025 expansion)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Golden State Valkyries', 'GSV', 'https://a.espncdn.com/i/teamlogos/wnba/500/gsv.png'
FROM leagues WHERE code = 'WNBA'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'WNBA' AND t.abbreviation = 'GSV'
);

-- Add MLS league if it doesn't exist
INSERT INTO leagues (code, name)
SELECT 'MLS', 'Major League Soccer'
WHERE NOT EXISTS (SELECT 1 FROM leagues WHERE code = 'MLS');

-- Add San Diego FC to MLS (2025 expansion)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'San Diego FC', 'SD', 'https://a.espncdn.com/i/teamlogos/mls/500/sd.png'
FROM leagues WHERE code = 'MLS'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'MLS' AND t.abbreviation = 'SD'
);

-- Add NWSL league if it doesn't exist
INSERT INTO leagues (code, name)
SELECT 'NWSL', 'National Women''s Soccer League'
WHERE NOT EXISTS (SELECT 1 FROM leagues WHERE code = 'NWSL');

-- Add Bay FC to NWSL (2024 expansion)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Bay FC', 'BAY', 'https://a.espncdn.com/i/teamlogos/nwsl/500/bay.png'
FROM leagues WHERE code = 'NWSL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'NWSL' AND t.abbreviation = 'BAY'
);

-- Add Utah Royals to NWSL (2024 re-establishment)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Utah Royals', 'UTA', 'https://a.espncdn.com/i/teamlogos/nwsl/500/uta.png'
FROM leagues WHERE code = 'NWSL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'NWSL' AND t.abbreviation = 'UTA'
);

-- Add PWHL league if it doesn't exist
INSERT INTO leagues (code, name)
SELECT 'PWHL', 'Professional Women''s Hockey League'
WHERE NOT EXISTS (SELECT 1 FROM leagues WHERE code = 'PWHL');

-- Add PWHL teams (2023-2024 inaugural season)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Boston PWHL', 'BOS', 'https://a.espncdn.com/i/teamlogos/pwhl/500/bos.png'
FROM leagues WHERE code = 'PWHL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'PWHL' AND t.abbreviation = 'BOS'
)
UNION ALL
SELECT id, 'Minnesota PWHL', 'MIN', 'https://a.espncdn.com/i/teamlogos/pwhl/500/min.png'
FROM leagues WHERE code = 'PWHL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'PWHL' AND t.abbreviation = 'MIN'
)
UNION ALL
SELECT id, 'Montreal PWHL', 'MTL', 'https://a.espncdn.com/i/teamlogos/pwhl/500/mtl.png'
FROM leagues WHERE code = 'PWHL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'PWHL' AND t.abbreviation = 'MTL'
)
UNION ALL
SELECT id, 'New York PWHL', 'NY', 'https://a.espncdn.com/i/teamlogos/pwhl/500/ny.png'
FROM leagues WHERE code = 'PWHL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'PWHL' AND t.abbreviation = 'NY'
)
UNION ALL
SELECT id, 'Ottawa PWHL', 'OTT', 'https://a.espncdn.com/i/teamlogos/pwhl/500/ott.png'
FROM leagues WHERE code = 'PWHL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'PWHL' AND t.abbreviation = 'OTT'
)
UNION ALL
SELECT id, 'Toronto PWHL', 'TOR', 'https://a.espncdn.com/i/teamlogos/pwhl/500/tor.png'
FROM leagues WHERE code = 'PWHL'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'PWHL' AND t.abbreviation = 'TOR'
);

-- Add more College Basketball teams to get to a more comprehensive list
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT id, 'Arizona State Sun Devils', 'ASU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/9.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'ASU'
)
UNION ALL
SELECT id, 'Arkansas Razorbacks', 'ARK', 'https://a.espncdn.com/i/teamlogos/ncaa/500/8.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'ARK'
)
UNION ALL
SELECT id, 'Butler Bulldogs', 'BUT', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2086.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'BUT'
)
UNION ALL
SELECT id, 'Florida State Seminoles', 'FSU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/52.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'FSU'
)
UNION ALL
SELECT id, 'Georgetown Hoyas', 'GTWN', 'https://a.espncdn.com/i/teamlogos/ncaa/500/97.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'GTWN'
)
UNION ALL
SELECT id, 'Gonzaga Bulldogs', 'GONZ', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'GONZ'
)
UNION ALL
SELECT id, 'LSU Tigers', 'LSU', 'https://a.espncdn.com/i/teamlogos/ncaa/500/99.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'LSU'
)
UNION ALL
SELECT id, 'Memphis Tigers', 'MEM', 'https://a.espncdn.com/i/teamlogos/ncaa/500/235.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'MEM'
)
UNION ALL
SELECT id, 'Michigan Wolverines', 'MICH', 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'MICH'
)
UNION ALL
SELECT id, 'Oregon Ducks', 'ORE', 'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png'
FROM leagues WHERE code = 'CBB'
WHERE NOT EXISTS (
  SELECT 1 FROM teams t 
  JOIN leagues l ON t.league_id = l.id 
  WHERE l.code = 'CBB' AND t.abbreviation = 'ORE'
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
