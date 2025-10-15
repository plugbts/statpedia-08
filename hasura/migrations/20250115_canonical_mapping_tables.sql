-- Migration: Create Canonical Mapping Tables for Stable Data Architecture
-- Database: Neon PostgreSQL via Hasura
-- Purpose: Establish single source of truth for players, teams, sportsbooks, and games

-- Create teams_canonical table
CREATE TABLE IF NOT EXISTS teams_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
    name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    logo_url TEXT,
    aliases JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(league, LOWER(name)),
    UNIQUE(league, UPPER(abbreviation))
);

-- Create players_canonical table
CREATE TABLE IF NOT EXISTS players_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    team_id UUID REFERENCES teams_canonical(id),
    league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
    position TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sportsbooks_canonical table
CREATE TABLE IF NOT EXISTS sportsbooks_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create games_canonical table
CREATE TABLE IF NOT EXISTS games_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT NOT NULL UNIQUE,
    home_team_id UUID NOT NULL REFERENCES teams_canonical(id),
    away_team_id UUID NOT NULL REFERENCES teams_canonical(id),
    league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
    game_date TIMESTAMP WITH TIME ZONE NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player_props_canonical table
CREATE TABLE IF NOT EXISTS player_props_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games_canonical(id),
    player_id UUID NOT NULL REFERENCES players_canonical(id),
    sportsbook_id UUID NOT NULL REFERENCES sportsbooks_canonical(id),
    market TEXT NOT NULL,
    line DECIMAL(10,2) NOT NULL,
    odds INTEGER,
    ev_percent DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(game_id, player_id, sportsbook_id, market, line)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_canonical_league ON teams_canonical(league);
CREATE INDEX IF NOT EXISTS idx_teams_canonical_abbreviation ON teams_canonical(abbreviation);
CREATE INDEX IF NOT EXISTS idx_teams_canonical_aliases ON teams_canonical USING GIN(aliases);
CREATE INDEX IF NOT EXISTS idx_players_canonical_external_id ON players_canonical(external_id);
CREATE INDEX IF NOT EXISTS idx_players_canonical_team_id ON players_canonical(team_id);
CREATE INDEX IF NOT EXISTS idx_players_canonical_league ON players_canonical(league);
CREATE INDEX IF NOT EXISTS idx_players_canonical_display_name ON players_canonical(display_name);
CREATE INDEX IF NOT EXISTS idx_games_canonical_external_id ON games_canonical(external_id);
CREATE INDEX IF NOT EXISTS idx_games_canonical_home_team ON games_canonical(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_canonical_away_team ON games_canonical(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_canonical_date ON games_canonical(game_date);
CREATE INDEX IF NOT EXISTS idx_games_canonical_league ON games_canonical(league);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_game_id ON player_props_canonical(game_id);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_player_id ON player_props_canonical(player_id);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_sportsbook_id ON player_props_canonical(sportsbook_id);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_market ON player_props_canonical(market);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_active ON player_props_canonical(is_active);

-- Seed NFL teams
INSERT INTO teams_canonical (league, name, abbreviation, logo_url, aliases) VALUES
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

-- Seed sportsbooks
INSERT INTO sportsbooks_canonical (name, api_key) VALUES
('Consensus', NULL),
('DraftKings', NULL),
('FanDuel', NULL),
('BetMGM', NULL),
('Caesars', NULL),
('PointsBet', NULL)
ON CONFLICT (name) DO NOTHING;
