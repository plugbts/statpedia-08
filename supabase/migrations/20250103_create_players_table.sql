-- Create players table for pre-joined player-to-team mapping
-- This eliminates the need to guess team assignments during ingestion

-- 1. Ensure players table exists
CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  team_abbr TEXT NOT NULL,
  league TEXT NOT NULL,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_players_league ON players(league);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_abbr);

-- 3. Add RLS policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON players
  FOR SELECT TO authenticated
  USING (true);

-- Allow service role to manage players
CREATE POLICY "Allow service role full access" ON players
  FOR ALL TO service_role
  USING (true);

-- 4. Insert distinct players from existing proplines data
INSERT INTO players (player_id, player_name, team_abbr, league)
SELECT DISTINCT
  p.player_id,
  p.player_name,
  COALESCE(p.team, 'UNK') as team_abbr,
  p.league
FROM proplines p
WHERE p.player_id IS NOT NULL 
  AND p.player_name IS NOT NULL
  AND p.player_name != 'null'
ON CONFLICT (player_id) DO UPDATE
SET 
  team_abbr = EXCLUDED.team_abbr,
  player_name = EXCLUDED.player_name,
  league = EXCLUDED.league,
  updated_at = NOW();

-- 5. Insert distinct players from player_game_logs as well
INSERT INTO players (player_id, player_name, team_abbr, league)
SELECT DISTINCT
  p.player_id,
  p.player_name,
  COALESCE(p.team, 'UNK') as team_abbr,
  p.league
FROM player_game_logs p
WHERE p.player_id IS NOT NULL 
  AND p.player_name IS NOT NULL
  AND p.player_name != 'null'
ON CONFLICT (player_id) DO UPDATE
SET 
  team_abbr = EXCLUDED.team_abbr,
  player_name = EXCLUDED.player_name,
  league = EXCLUDED.league,
  updated_at = NOW();

-- 6. Normalize team abbreviations after backfill
UPDATE players
SET team_abbr = CASE
  WHEN team_abbr = 'UNK' AND league = 'nfl' THEN 'FA' -- Free Agent placeholder
  WHEN team_abbr = 'UNK' AND league = 'nba' THEN 'FA'
  WHEN team_abbr = 'UNK' AND league = 'mlb' THEN 'FA'
  WHEN team_abbr = 'UNK' AND league = 'nhl' THEN 'FA'
  ELSE team_abbr
END,
updated_at = NOW();

-- 7. Add some manual fixes for known players
UPDATE players 
SET team_abbr = 'NYJ'
WHERE player_id = 'AARON_RODGERS_1_NFL' 
  OR player_id = 'AARON_RODGERS'
  OR player_name ILIKE '%aaron rodgers%';

UPDATE players 
SET team_abbr = 'NYJ'
WHERE player_id = 'BO_NIX' 
  OR player_name ILIKE '%bo nix%';

UPDATE players 
SET team_abbr = 'WAS'
WHERE player_id = 'DJ_MOORE' 
  OR player_name ILIKE '%dj moore%';

-- 8. Create a view for easy player lookup with team info
CREATE OR REPLACE VIEW player_team_lookup AS
SELECT 
  p.player_id,
  p.player_name,
  p.team_abbr,
  p.league,
  p.position,
  CASE 
    WHEN p.team_abbr IS NOT NULL AND p.team_abbr != 'UNK' AND p.team_abbr != 'FA' THEN 
      'https://a.espncdn.com/i/teamlogos/' || 
      CASE p.league
        WHEN 'nfl' THEN 'nfl'
        WHEN 'nba' THEN 'nba' 
        WHEN 'mlb' THEN 'mlb'
        WHEN 'nhl' THEN 'nhl'
        ELSE 'nfl'
      END || '/500/' || LOWER(p.team_abbr) || '.png'
    ELSE NULL
  END as team_logo_url,
  p.created_at,
  p.updated_at
FROM players p;

-- 9. Add RLS to the view
ALTER VIEW player_team_lookup SET (security_invoker = true);
