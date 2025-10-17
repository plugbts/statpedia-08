-- Seed team_abbrev_map directly from teams and leagues
-- Creates a mapping for each team using its canonical abbreviation as api_abbrev

INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
SELECT l.code AS league, t.abbreviation AS api_abbrev, t.id AS team_id
FROM teams t
JOIN leagues l ON l.id = t.league_id
ON CONFLICT (league, api_abbrev) DO NOTHING;
