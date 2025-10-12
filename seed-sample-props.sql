-- Seed sample player props data for testing UI

-- First, let's add some sample players to existing teams
INSERT INTO players (team_id, name, position)
SELECT t.id, 'LeBron James', 'SF'
FROM teams t 
JOIN leagues l ON t.league_id = l.id 
WHERE t.abbreviation = 'LAL' AND l.code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, name, position)
SELECT t.id, 'Anthony Davis', 'PF'
FROM teams t 
JOIN leagues l ON t.league_id = l.id 
WHERE t.abbreviation = 'LAL' AND l.code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, name, position)
SELECT t.id, 'Stephen Curry', 'PG'
FROM teams t 
JOIN leagues l ON t.league_id = l.id 
WHERE t.abbreviation = 'GSW' AND l.code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, name, position)
SELECT t.id, 'Lamar Jackson', 'QB'
FROM teams t 
JOIN leagues l ON t.league_id = l.id 
WHERE t.abbreviation = 'BAL' AND l.code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, name, position)
SELECT t.id, 'Josh Allen', 'QB'
FROM teams t 
JOIN leagues l ON t.league_id = l.id 
WHERE t.abbreviation = 'BUF' AND l.code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, name, position)
SELECT t.id, 'Aaron Judge', 'OF'
FROM teams t 
JOIN leagues l ON t.league_id = l.id 
WHERE t.abbreviation = 'NYY' AND l.code = 'MLB'
ON CONFLICT DO NOTHING;

-- Now add some sample props
INSERT INTO props (player_id, team_id, game_id, prop_type, line, odds)
SELECT 
  p.id,
  t.id,
  'game_' || p.id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  'Points',
  25.5,
  '-110'
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.name = 'LeBron James' AND l.code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO props (player_id, team_id, game_id, prop_type, line, odds)
SELECT 
  p.id,
  t.id,
  'game_' || p.id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  'Rebounds',
  10.5,
  '-105'
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.name = 'Anthony Davis' AND l.code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO props (player_id, team_id, game_id, prop_type, line, odds)
SELECT 
  p.id,
  t.id,
  'game_' || p.id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  'Three Pointers Made',
  4.5,
  '-115'
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.name = 'Stephen Curry' AND l.code = 'NBA'
ON CONFLICT DO NOTHING;

INSERT INTO props (player_id, team_id, game_id, prop_type, line, odds)
SELECT 
  p.id,
  t.id,
  'game_' || p.id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  'Passing Yards',
  275.5,
  '-110'
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.name = 'Lamar Jackson' AND l.code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO props (player_id, team_id, game_id, prop_type, line, odds)
SELECT 
  p.id,
  t.id,
  'game_' || p.id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  'Passing Touchdowns',
  1.5,
  '-105'
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.name = 'Josh Allen' AND l.code = 'NFL'
ON CONFLICT DO NOTHING;

INSERT INTO props (player_id, team_id, game_id, prop_type, line, odds)
SELECT 
  p.id,
  t.id,
  'game_' || p.id || '_' || EXTRACT(EPOCH FROM NOW())::text,
  'Home Runs',
  0.5,
  '-120'
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
WHERE p.name = 'Aaron Judge' AND l.code = 'MLB'
ON CONFLICT DO NOTHING;
