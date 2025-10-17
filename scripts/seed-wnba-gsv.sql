-- Ensure Golden State Valkyries (GSV) exists in teams and team_abbrev_map for WNBA

-- 1) Insert team if missing
WITH w AS (
  SELECT id AS league_id FROM leagues WHERE code = 'WNBA'
)
INSERT INTO teams (league_id, name, abbreviation, logo_url)
SELECT w.league_id, 'Golden State Valkyries', 'GSV', 'https://a.espncdn.com/i/teamlogos/wnba/500/gsv.png'
FROM w
WHERE NOT EXISTS (
  SELECT 1 FROM teams t WHERE t.league_id = w.league_id AND t.abbreviation = 'GSV'
);

-- 2) Insert abbrev mapping if missing
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
SELECT 'WNBA', 'GSV', t.id
FROM teams t
JOIN leagues l ON l.id = t.league_id
WHERE l.code = 'WNBA' AND t.abbreviation = 'GSV'
ON CONFLICT (league, api_abbrev) DO NOTHING;
