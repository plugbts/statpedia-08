-- Fix the canonical schema to work with existing UUID-based structure
-- Add missing columns and fix indexes

-- Add league column to games table if it doesn't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS league TEXT;

-- Add league column to players table if it doesn't exist  
ALTER TABLE players ADD COLUMN IF NOT EXISTS league TEXT;

-- Update existing records to have league values
UPDATE games SET league = (
  SELECT l.code 
  FROM leagues l 
  WHERE l.id = games.league_id
) WHERE league IS NULL;

UPDATE players SET league = (
  SELECT l.code 
  FROM leagues l 
  JOIN teams t ON t.league_id = l.id 
  WHERE t.id = players.team_id
) WHERE league IS NULL;

-- Fix player_game_logs table structure
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS league TEXT;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS opponent_team_id UUID REFERENCES teams(id);

-- Update existing records
UPDATE player_game_logs SET league = (
  SELECT l.code 
  FROM leagues l 
  JOIN teams t ON t.league_id = l.id 
  WHERE t.id = player_game_logs.team_id
) WHERE league IS NULL;

-- Set opponent_team_id based on game data
UPDATE player_game_logs 
SET opponent_team_id = (
  SELECT CASE 
    WHEN pgl.team_id = g.home_team_id THEN g.away_team_id
    ELSE g.home_team_id
  END
  FROM games g 
  WHERE g.id = player_game_logs.game_id
)
WHERE opponent_team_id IS NULL;

-- Add missing stat columns to player_game_logs
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS passing_yards NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS passing_tds NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS passing_completions NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS passing_attempts NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS interceptions NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rush_yards NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rush_attempts NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rush_tds NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rec_yards NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rec_receptions NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rec_tds NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS longest_reception NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS fumbles NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS points NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS assists NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rebounds NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS three_pointers_made NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS three_pointers_attempted NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS steals NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS blocks NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS turnovers NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS minutes NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS hits NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS at_bats NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS runs NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS rbis NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS home_runs NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS doubles NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS triples NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS walks NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS strikeouts NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS stolen_bases NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS goals NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS assists_hockey NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS points_hockey NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS shots_on_goal NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS saves NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS goals_against NUMERIC;
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '{}';

-- Create proper indexes
CREATE INDEX IF NOT EXISTS idx_games_league_season 
  ON games (league, season, game_date_time);
CREATE INDEX IF NOT EXISTS idx_games_teams 
  ON games (home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_players_league_team 
  ON players (league, team_id);

CREATE INDEX IF NOT EXISTS idx_player_logs_player_date
  ON player_game_logs (player_id, game_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_logs_opponent
  ON player_game_logs (player_id, opponent_team_id, game_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_logs_game
  ON player_game_logs (game_id);
CREATE INDEX IF NOT EXISTS idx_player_logs_league_date
  ON player_game_logs (league, game_date DESC);

CREATE INDEX IF NOT EXISTS idx_defense_ranks_lookup
  ON defense_ranks (league, team_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_defense_ranks_league
  ON defense_ranks (league, prop_type, rank);

-- Add indexes for props analytics
CREATE INDEX IF NOT EXISTS idx_props_analytics
  ON props (player_id, prop_type, line) 
  WHERE source = 'sportsbook';

-- Show current state
SELECT 'Games with league data:' as info, COUNT(*) as count FROM games WHERE league IS NOT NULL
UNION ALL
SELECT 'Players with league data:', COUNT(*) FROM players WHERE league IS NOT NULL  
UNION ALL
SELECT 'Player logs with league data:', COUNT(*) FROM player_game_logs WHERE league IS NOT NULL
UNION ALL
SELECT 'Player logs with opponent data:', COUNT(*) FROM player_game_logs WHERE opponent_team_id IS NOT NULL;
