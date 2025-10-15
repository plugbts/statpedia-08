-- Canonical Mapping Tables for Stable Data Architecture
-- This migration creates the foundation for stable boundaries between ingestion, normalization, and presentation

-- 1. CANONICAL PLAYERS TABLE
-- Single source of truth for player information
CREATE TABLE IF NOT EXISTS players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE, -- API player ID from external sources
  display_name TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
  position TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_league ON players(league);
CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);

-- 2. CANONICAL TEAMS TABLE (Enhanced)
-- Single source of truth for team information
CREATE TABLE IF NOT EXISTS teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
  name TEXT NOT NULL, -- Full team name, e.g., "Green Bay Packers"
  abbreviation TEXT NOT NULL, -- e.g., "GB"
  logo_url TEXT,
  aliases JSONB DEFAULT '[]'::jsonb, -- Array of alternate names
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure uniqueness per league
  UNIQUE(league, LOWER(name)),
  UNIQUE(league, UPPER(abbreviation))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
CREATE INDEX IF NOT EXISTS idx_teams_abbreviation ON teams(abbreviation);
CREATE INDEX IF NOT EXISTS idx_teams_aliases ON teams USING GIN(aliases);

-- 3. CANONICAL SPORTSBOOKS TABLE
-- Single source of truth for sportsbook information
CREATE TABLE IF NOT EXISTS sportsbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- e.g., "DraftKings", "FanDuel"
  api_key TEXT, -- For API integrations
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sportsbooks_name ON sportsbooks(name);

-- 4. CANONICAL GAMES TABLE
-- Single source of truth for game information
CREATE TABLE IF NOT EXISTS games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE, -- API game ID from external sources
  home_team_id UUID NOT NULL REFERENCES teams(id),
  away_team_id UUID NOT NULL REFERENCES teams(id),
  league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER, -- For NFL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_games_external_id ON games(external_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_league ON games(league);

-- 5. ENHANCED PLAYER_PROPS TABLE
-- Raw ingestion table that references canonical tables
CREATE TABLE IF NOT EXISTS player_props (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id),
  player_id UUID NOT NULL REFERENCES players(id),
  sportsbook_id UUID NOT NULL REFERENCES sportsbooks(id),
  market TEXT NOT NULL, -- e.g., "Passing Yards", "Rushing Touchdowns"
  line DECIMAL(10,2) NOT NULL,
  odds INTEGER, -- American odds format
  ev_percent DECIMAL(5,2), -- Expected value percentage
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate props
  UNIQUE(game_id, player_id, sportsbook_id, market, line)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_props_game_id ON player_props(game_id);
CREATE INDEX IF NOT EXISTS idx_player_props_player_id ON player_props(player_id);
CREATE INDEX IF NOT EXISTS idx_player_props_sportsbook_id ON player_props(sportsbook_id);
CREATE INDEX IF NOT EXISTS idx_player_props_market ON player_props(market);
CREATE INDEX IF NOT EXISTS idx_player_props_active ON player_props(is_active);

-- 6. PLAYER ENRICHED STATS TABLE
-- For additional analytics and enrichment data
CREATE TABLE IF NOT EXISTS player_enriched_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id),
  game_id UUID NOT NULL REFERENCES games(id),
  streak TEXT, -- e.g., "3/5", "7/10"
  rating DECIMAL(5,2), -- Overall rating
  matchup_rank INTEGER, -- Rank against opponent
  l5 DECIMAL(5,2), -- Last 5 games average
  l10 DECIMAL(5,2), -- Last 10 games average
  l20 DECIMAL(5,2), -- Last 20 games average
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(player_id, game_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enriched_stats_player_id ON player_enriched_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_enriched_stats_game_id ON player_enriched_stats(game_id);

-- 7. UPDATE TRIGGERS FOR ALL TABLES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sportsbooks_updated_at
  BEFORE UPDATE ON sportsbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_props_updated_at
  BEFORE UPDATE ON player_props
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enriched_stats_updated_at
  BEFORE UPDATE ON player_enriched_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_props ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_enriched_stats ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES - Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON sportsbooks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON games
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON player_props
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON player_enriched_stats
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access for ingestion
CREATE POLICY "Allow service role full access" ON players
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON teams
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON sportsbooks
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON games
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON player_props
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON player_enriched_stats
  FOR ALL TO service_role USING (true);

-- 10. SEED INITIAL DATA
-- Insert default sportsbooks
INSERT INTO sportsbooks (name, api_key) VALUES
('Consensus', NULL),
('DraftKings', NULL),
('FanDuel', NULL),
('BetMGM', NULL),
('Caesars', NULL),
('PointsBet', NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert NFL teams (expand as needed)
INSERT INTO teams (league, name, abbreviation, logo_url, aliases) VALUES
('nfl', 'Arizona Cardinals', 'ARI', 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', '["cardinals", "ari", "az"]'),
('nfl', 'Atlanta Falcons', 'ATL', 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', '["falcons", "atl"]'),
('nfl', 'Baltimore Ravens', 'BAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', '["ravens", "bal"]'),
('nfl', 'Buffalo Bills', 'BUF', 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', '["bills", "buf"]'),
('nfl', 'Carolina Panthers', 'CAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', '["panthers", "car"]'),
('nfl', 'Chicago Bears', 'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', '["bears", "chi"]'),
('nfl', 'Cincinnati Bengals', 'CIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', '["bengals", "cin"]'),
('nfl', 'Cleveland Browns', 'CLE', 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', '["browns", "cle"]'),
('nfl', 'Dallas Cowboys', 'DAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', '["cowboys", "dal"]'),
('nfl', 'Denver Broncos', 'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', '["broncos", "den"]'),
('nfl', 'Detroit Lions', 'DET', 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', '["lions", "det"]'),
('nfl', 'Green Bay Packers', 'GB', 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', '["packers", "green bay", "gb"]'),
('nfl', 'Houston Texans', 'HOU', 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', '["texans", "hou"]'),
('nfl', 'Indianapolis Colts', 'IND', 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', '["colts", "ind"]'),
('nfl', 'Jacksonville Jaguars', 'JAX', 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', '["jaguars", "jax"]'),
('nfl', 'Kansas City Chiefs', 'KC', 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', '["chiefs", "kc"]'),
('nfl', 'Las Vegas Raiders', 'LV', 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', '["raiders", "lv", "oakland raiders"]'),
('nfl', 'Los Angeles Chargers', 'LAC', 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', '["chargers", "lac"]'),
('nfl', 'Los Angeles Rams', 'LAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', '["rams", "lar"]'),
('nfl', 'Miami Dolphins', 'MIA', 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', '["dolphins", "mia"]'),
('nfl', 'Minnesota Vikings', 'MIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', '["vikings", "min"]'),
('nfl', 'New England Patriots', 'NE', 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', '["patriots", "ne"]'),
('nfl', 'New Orleans Saints', 'NO', 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', '["saints", "nola saints", "no"]'),
('nfl', 'New York Giants', 'NYG', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', '["giants", "nyg", "ny giants"]'),
('nfl', 'New York Jets', 'NYJ', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', '["jets", "ny jets", "nyj"]'),
('nfl', 'Philadelphia Eagles', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', '["eagles", "phi"]'),
('nfl', 'Pittsburgh Steelers', 'PIT', 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', '["steelers", "pit"]'),
('nfl', 'San Francisco 49ers', 'SF', 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', '["49ers", "sf"]'),
('nfl', 'Seattle Seahawks', 'SEA', 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', '["seahawks", "sea"]'),
('nfl', 'Tampa Bay Buccaneers', 'TB', 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', '["buccaneers", "tb", "bucs"]'),
('nfl', 'Tennessee Titans', 'TEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', '["titans", "ten"]'),
('nfl', 'Washington Commanders', 'WAS', 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', '["commanders", "was", "washington football team", "redskins"]')
ON CONFLICT (league, LOWER(name)) DO NOTHING;

-- Grant permissions
GRANT SELECT ON players TO authenticated;
GRANT SELECT ON teams TO authenticated;
GRANT SELECT ON sportsbooks TO authenticated;
GRANT SELECT ON games TO authenticated;
GRANT SELECT ON player_props TO authenticated;
GRANT SELECT ON player_enriched_stats TO authenticated;

GRANT ALL ON players TO service_role;
GRANT ALL ON teams TO service_role;
GRANT ALL ON sportsbooks TO service_role;
GRANT ALL ON games TO service_role;
GRANT ALL ON player_props TO service_role;
GRANT ALL ON player_enriched_stats TO service_role;
