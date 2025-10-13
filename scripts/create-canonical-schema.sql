-- Canonical database schema for real analytics system
-- This creates the foundation for all real data ingestion

-- Canonical schedule + opponent mapping
CREATE TABLE IF NOT EXISTS games (
  id BIGINT PRIMARY KEY,
  league TEXT NOT NULL,              -- NFL/NBA/MLB/NHL/...
  season INT NOT NULL,
  week_or_day TEXT,                  -- week (NFL), date key (NBA/MLB/NHL)
  start_time TIMESTAMPTZ NOT NULL,
  home_team_id BIGINT NOT NULL,
  away_team_id BIGINT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Normalized player index
CREATE TABLE IF NOT EXISTS players (
  id BIGINT PRIMARY KEY,
  league TEXT NOT NULL,
  team_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  external_id TEXT,                  -- ESPN, NBA, MLB, etc. ID
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-game player logs (one row per player per game, across all leagues)
CREATE TABLE IF NOT EXISTS player_game_logs (
  id BIGSERIAL PRIMARY KEY,
  league TEXT NOT NULL,
  player_id BIGINT NOT NULL REFERENCES players(id),
  team_id BIGINT NOT NULL,
  opponent_team_id BIGINT NOT NULL,
  game_id BIGINT NOT NULL REFERENCES games(id),
  game_date DATE NOT NULL,
  -- Core stat buckets: store raw numeric facts, not interpretations
  passing_yards NUMERIC,
  passing_tds NUMERIC,
  passing_completions NUMERIC,
  passing_attempts NUMERIC,
  interceptions NUMERIC,
  rush_yards NUMERIC,
  rush_attempts NUMERIC,
  rush_tds NUMERIC,
  rec_yards NUMERIC,
  rec_receptions NUMERIC,
  rec_tds NUMERIC,
  longest_reception NUMERIC,
  fumbles NUMERIC,
  -- NBA stats
  points NUMERIC,
  assists NUMERIC,
  rebounds NUMERIC,
  three_pointers_made NUMERIC,
  three_pointers_attempted NUMERIC,
  steals NUMERIC,
  blocks NUMERIC,
  turnovers NUMERIC,
  minutes NUMERIC,
  -- MLB stats
  hits NUMERIC,
  at_bats NUMERIC,
  runs NUMERIC,
  rbis NUMERIC,
  home_runs NUMERIC,
  doubles NUMERIC,
  triples NUMERIC,
  walks NUMERIC,
  strikeouts NUMERIC,
  stolen_bases NUMERIC,
  -- NHL stats
  goals NUMERIC,
  assists_hockey NUMERIC,
  points_hockey NUMERIC,
  shots_on_goal NUMERIC,
  saves NUMERIC,
  goals_against NUMERIC,
  -- extensible JSON for less common stats
  extras JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Defensive rank vs prop type (updated daily/weekly)
CREATE TABLE IF NOT EXISTS defense_ranks (
  id BIGSERIAL PRIMARY KEY,
  league TEXT NOT NULL,
  team_id BIGINT NOT NULL,
  prop_type TEXT NOT NULL,           -- e.g., "Receiving Yards", "Points", "SOg"
  rank INT NOT NULL,                 -- 1 = toughest, higher = easier
  sample_size INT,                   -- games considered
  avg_allowed NUMERIC,               -- average stat allowed
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league, team_id, prop_type)
);

-- Add analytics columns to props table (if not already present)
ALTER TABLE props
  ADD COLUMN IF NOT EXISTS hit_rate_l5 NUMERIC,
  ADD COLUMN IF NOT EXISTS hit_rate_l10 NUMERIC,
  ADD COLUMN IF NOT EXISTS hit_rate_l20 NUMERIC,
  ADD COLUMN IF NOT EXISTS streak_current INT,
  ADD COLUMN IF NOT EXISTS h2h_hit_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS matchup_rank INT,
  ADD COLUMN IF NOT EXISTS matchup_grade NUMERIC,
  ADD COLUMN IF NOT EXISTS historical_average NUMERIC,
  ADD COLUMN IF NOT EXISTS games_tracked INT DEFAULT 0;

-- Indexes for speed
CREATE INDEX IF NOT EXISTS idx_games_league_season 
  ON games (league, season, start_time);
CREATE INDEX IF NOT EXISTS idx_games_teams 
  ON games (home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_players_league_team 
  ON players (league, team_id);
CREATE INDEX IF NOT EXISTS idx_players_external_id 
  ON players (league, external_id);

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

-- Comments for documentation
COMMENT ON TABLE games IS 'Canonical game schedule with opponent mapping';
COMMENT ON TABLE players IS 'Normalized player index across all leagues';
COMMENT ON TABLE player_game_logs IS 'Raw player performance data per game';
COMMENT ON TABLE defense_ranks IS 'Team defensive rankings by prop type';
