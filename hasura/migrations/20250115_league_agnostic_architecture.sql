-- League-Agnostic Architecture Migration
-- This migration establishes the foundation for multi-league support
-- without reinventing the wheel for each sport

-- ==============================================
-- 1. CANONICAL TABLES (League-Agnostic)
-- ==============================================

-- Teams table with league support
CREATE TABLE IF NOT EXISTS teams_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    logo_url TEXT,
    aliases JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- League-aware unique constraints
    CONSTRAINT teams_canonical_league_name_unique UNIQUE (league, name),
    CONSTRAINT teams_canonical_league_abbrev_unique UNIQUE (league, abbreviation)
);

-- Players table with league support
CREATE TABLE IF NOT EXISTS players_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    external_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    position TEXT,
    team_id UUID REFERENCES teams_canonical(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- League-aware unique constraint
    CONSTRAINT players_canonical_league_external_id_unique UNIQUE (league, external_id)
);

-- Games table with league support
CREATE TABLE IF NOT EXISTS games_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    api_game_id TEXT NOT NULL,
    game_date DATE NOT NULL,
    home_team_id UUID REFERENCES teams_canonical(id),
    away_team_id UUID REFERENCES teams_canonical(id),
    season TEXT,
    week INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- League-aware unique constraint
    CONSTRAINT games_canonical_league_api_id_unique UNIQUE (league, api_game_id)
);

-- Sportsbooks table (shared across all leagues)
CREATE TABLE IF NOT EXISTS sportsbooks_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Player props table with league support
CREATE TABLE IF NOT EXISTS player_props_canonical (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    player_id UUID REFERENCES players_canonical(id),
    game_id UUID REFERENCES games_canonical(id),
    sportsbook_id UUID REFERENCES sportsbooks_canonical(id),
    market TEXT NOT NULL,
    line DECIMAL(10,2),
    odds INTEGER,
    ev_percent DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Player enriched stats table with league support
CREATE TABLE IF NOT EXISTS player_enriched_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players_canonical(id),
    game_id UUID NOT NULL REFERENCES games_canonical(id),
    league TEXT NOT NULL,
    streak TEXT,
    rating DECIMAL(5,2),
    matchup_rank INTEGER,
    l5 DECIMAL(5,2),
    l10 DECIMAL(5,2),
    l20 DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Unique constraint per player-game-league combination
    CONSTRAINT player_enriched_stats_unique UNIQUE(player_id, game_id, league)
);

-- ==============================================
-- 2. UNIFIED NORMALIZED VIEW
-- ==============================================

-- Single view that works for all leagues
CREATE OR REPLACE VIEW player_props_normalized AS
SELECT 
    pp.id AS prop_id,
    pp.league,
    pp.game_id,
    g.game_date,
    pp.market,
    pp.line,
    pp.odds,
    pp.ev_percent,
    
    -- Player info
    p.id AS player_id,
    p.display_name AS player_name,
    p.external_id AS api_player_id,
    p.position,
    
    -- Team info
    t.id AS team_id,
    t.name AS team_name,
    t.abbreviation AS team_abbrev,
    t.logo_url AS team_logo,
    
    -- Opponent info
    ot.id AS opponent_id,
    ot.name AS opponent_name,
    ot.abbreviation AS opponent_abbrev,
    ot.logo_url AS opponent_logo,
    
    -- Sportsbook info
    sb.id AS sportsbook_id,
    sb.name AS sportsbook_name,
    
    -- Game info
    g.season,
    g.week,
    
    -- Enrichment stats
    es.streak,
    es.rating,
    es.matchup_rank,
    es.l5,
    es.l10,
    es.l20,
    
    -- Metadata
    pp.is_active,
    pp.created_at,
    pp.updated_at
    
FROM player_props_canonical pp
JOIN players_canonical p ON p.id = pp.player_id AND p.league = pp.league
JOIN teams_canonical t ON t.id = p.team_id AND t.league = pp.league
JOIN games_canonical g ON g.id = pp.game_id AND g.league = pp.league
JOIN teams_canonical ot ON ot.id = CASE 
    WHEN g.home_team_id = p.team_id THEN g.away_team_id 
    ELSE g.home_team_id 
END AND ot.league = pp.league
JOIN sportsbooks_canonical sb ON sb.id = pp.sportsbook_id
LEFT JOIN player_enriched_stats es 
    ON es.player_id = pp.player_id 
    AND es.game_id = pp.game_id
    AND es.league = pp.league
WHERE pp.is_active = true
  AND p.is_active = true
  AND t.is_active = true
  AND ot.is_active = true
  AND sb.is_active = true
  AND g.is_active = true;

-- ==============================================
-- 3. LEAGUE-AGNOSTIC RESOLUTION FUNCTIONS
-- ==============================================

-- Team resolution by league
CREATE OR REPLACE FUNCTION resolve_team_by_league(
    team_input TEXT,
    league_input TEXT
) RETURNS UUID AS $$
DECLARE
    team_id UUID;
BEGIN
    -- Try abbreviation first
    SELECT id INTO team_id 
    FROM teams_canonical 
    WHERE UPPER(abbreviation) = UPPER(team_input)
    AND league = league_input
    AND is_active = true
    LIMIT 1;
    
    -- Try name if abbreviation didn't work
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams_canonical 
        WHERE LOWER(name) = LOWER(team_input)
        AND league = league_input
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Try aliases if name didn't work
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams_canonical 
        WHERE aliases ? LOWER(team_input)
        AND league = league_input
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN team_id;
END;
$$ LANGUAGE plpgsql;

-- Player resolution by league
CREATE OR REPLACE FUNCTION resolve_player_by_league(
    player_input TEXT,
    league_input TEXT,
    team_id_input UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    player_id UUID;
BEGIN
    -- Try external_id first
    SELECT id INTO player_id 
    FROM players_canonical 
    WHERE external_id = player_input
    AND league = league_input
    AND (team_id_input IS NULL OR team_id = team_id_input)
    AND is_active = true
    LIMIT 1;
    
    -- Try display_name if external_id didn't work
    IF player_id IS NULL THEN
        SELECT id INTO player_id 
        FROM players_canonical 
        WHERE LOWER(display_name) = LOWER(player_input)
        AND league = league_input
        AND (team_id_input IS NULL OR team_id = team_id_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN player_id;
END;
$$ LANGUAGE plpgsql;

-- Game resolution by league
CREATE OR REPLACE FUNCTION resolve_game_by_league(
    api_game_id_input TEXT,
    league_input TEXT,
    game_date_input DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    game_id UUID;
BEGIN
    -- Try api_game_id first
    SELECT id INTO game_id 
    FROM games_canonical 
    WHERE api_game_id = api_game_id_input
    AND league = league_input
    AND (game_date_input IS NULL OR game_date = game_date_input)
    AND is_active = true
    LIMIT 1;
    
    RETURN game_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. LEAGUE SEEDING DATA
-- ==============================================

-- NFL Teams (32 teams)
INSERT INTO teams_canonical (league, name, abbreviation, logo_url, aliases) VALUES
('nfl', 'Arizona Cardinals', 'ARI', 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', '[]'::jsonb),
('nfl', 'Atlanta Falcons', 'ATL', 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', '[]'::jsonb),
('nfl', 'Baltimore Ravens', 'BAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', '[]'::jsonb),
('nfl', 'Buffalo Bills', 'BUF', 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', '[]'::jsonb),
('nfl', 'Carolina Panthers', 'CAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', '[]'::jsonb),
('nfl', 'Chicago Bears', 'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', '[]'::jsonb),
('nfl', 'Cincinnati Bengals', 'CIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', '[]'::jsonb),
('nfl', 'Cleveland Browns', 'CLE', 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', '[]'::jsonb),
('nfl', 'Dallas Cowboys', 'DAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', '[]'::jsonb),
('nfl', 'Denver Broncos', 'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', '[]'::jsonb),
('nfl', 'Detroit Lions', 'DET', 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', '[]'::jsonb),
('nfl', 'Green Bay Packers', 'GB', 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', '[]'::jsonb),
('nfl', 'Houston Texans', 'HOU', 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', '[]'::jsonb),
('nfl', 'Indianapolis Colts', 'IND', 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', '[]'::jsonb),
('nfl', 'Jacksonville Jaguars', 'JAX', 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', '[]'::jsonb),
('nfl', 'Kansas City Chiefs', 'KC', 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', '[]'::jsonb),
('nfl', 'Las Vegas Raiders', 'LV', 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', '[]'::jsonb),
('nfl', 'Los Angeles Chargers', 'LAC', 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', '[]'::jsonb),
('nfl', 'Los Angeles Rams', 'LAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', '[]'::jsonb),
('nfl', 'Miami Dolphins', 'MIA', 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', '[]'::jsonb),
('nfl', 'Minnesota Vikings', 'MIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', '[]'::jsonb),
('nfl', 'New England Patriots', 'NE', 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', '[]'::jsonb),
('nfl', 'New Orleans Saints', 'NO', 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', '[]'::jsonb),
('nfl', 'New York Giants', 'NYG', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', '[]'::jsonb),
('nfl', 'New York Jets', 'NYJ', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', '[]'::jsonb),
('nfl', 'Philadelphia Eagles', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', '[]'::jsonb),
('nfl', 'Pittsburgh Steelers', 'PIT', 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', '[]'::jsonb),
('nfl', 'San Francisco 49ers', 'SF', 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', '[]'::jsonb),
('nfl', 'Seattle Seahawks', 'SEA', 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', '[]'::jsonb),
('nfl', 'Tampa Bay Buccaneers', 'TB', 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', '[]'::jsonb),
('nfl', 'Tennessee Titans', 'TEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', '[]'::jsonb),
('nfl', 'Washington Commanders', 'WSH', 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', '[]'::jsonb)
ON CONFLICT (league, name) DO NOTHING;

-- NBA Teams (30 teams)
INSERT INTO teams_canonical (league, name, abbreviation, logo_url, aliases) VALUES
('nba', 'Atlanta Hawks', 'ATL', 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png', '[]'::jsonb),
('nba', 'Boston Celtics', 'BOS', 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', '[]'::jsonb),
('nba', 'Brooklyn Nets', 'BKN', 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png', '[]'::jsonb),
('nba', 'Charlotte Hornets', 'CHA', 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png', '[]'::jsonb),
('nba', 'Chicago Bulls', 'CHI', 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', '[]'::jsonb),
('nba', 'Cleveland Cavaliers', 'CLE', 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png', '[]'::jsonb),
('nba', 'Dallas Mavericks', 'DAL', 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png', '[]'::jsonb),
('nba', 'Denver Nuggets', 'DEN', 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', '[]'::jsonb),
('nba', 'Detroit Pistons', 'DET', 'https://a.espncdn.com/i/teamlogos/nba/500/det.png', '[]'::jsonb),
('nba', 'Golden State Warriors', 'GSW', 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png', '[]'::jsonb),
('nba', 'Houston Rockets', 'HOU', 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png', '[]'::jsonb),
('nba', 'Indiana Pacers', 'IND', 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png', '[]'::jsonb),
('nba', 'Los Angeles Clippers', 'LAC', 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png', '[]'::jsonb),
('nba', 'Los Angeles Lakers', 'LAL', 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', '[]'::jsonb),
('nba', 'Memphis Grizzlies', 'MEM', 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png', '[]'::jsonb),
('nba', 'Miami Heat', 'MIA', 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', '[]'::jsonb),
('nba', 'Milwaukee Bucks', 'MIL', 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', '[]'::jsonb),
('nba', 'Minnesota Timberwolves', 'MIN', 'https://a.espncdn.com/i/teamlogos/nba/500/min.png', '[]'::jsonb),
('nba', 'New Orleans Pelicans', 'NOP', 'https://a.espncdn.com/i/teamlogos/nba/500/nop.png', '[]'::jsonb),
('nba', 'New York Knicks', 'NYK', 'https://a.espncdn.com/i/teamlogos/nba/500/nyk.png', '[]'::jsonb),
('nba', 'Oklahoma City Thunder', 'OKC', 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png', '[]'::jsonb),
('nba', 'Orlando Magic', 'ORL', 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png', '[]'::jsonb),
('nba', 'Philadelphia 76ers', 'PHI', 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png', '[]'::jsonb),
('nba', 'Phoenix Suns', 'PHX', 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', '[]'::jsonb),
('nba', 'Portland Trail Blazers', 'POR', 'https://a.espncdn.com/i/teamlogos/nba/500/por.png', '[]'::jsonb),
('nba', 'Sacramento Kings', 'SAC', 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png', '[]'::jsonb),
('nba', 'San Antonio Spurs', 'SAS', 'https://a.espncdn.com/i/teamlogos/nba/500/sas.png', '[]'::jsonb),
('nba', 'Toronto Raptors', 'TOR', 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png', '[]'::jsonb),
('nba', 'Utah Jazz', 'UTA', 'https://a.espncdn.com/i/teamlogos/nba/500/uta.png', '[]'::jsonb),
('nba', 'Washington Wizards', 'WAS', 'https://a.espncdn.com/i/teamlogos/nba/500/was.png', '[]'::jsonb)
ON CONFLICT (league, name) DO NOTHING;

-- MLB Teams (30 teams)
INSERT INTO teams_canonical (league, name, abbreviation, logo_url, aliases) VALUES
('mlb', 'Arizona Diamondbacks', 'ARI', 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png', '[]'::jsonb),
('mlb', 'Atlanta Braves', 'ATL', 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png', '[]'::jsonb),
('mlb', 'Baltimore Orioles', 'BAL', 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png', '[]'::jsonb),
('mlb', 'Boston Red Sox', 'BOS', 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png', '[]'::jsonb),
('mlb', 'Chicago Cubs', 'CHC', 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png', '[]'::jsonb),
('mlb', 'Chicago White Sox', 'CWS', 'https://a.espncdn.com/i/teamlogos/mlb/500/cws.png', '[]'::jsonb),
('mlb', 'Cincinnati Reds', 'CIN', 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png', '[]'::jsonb),
('mlb', 'Cleveland Guardians', 'CLE', 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png', '[]'::jsonb),
('mlb', 'Colorado Rockies', 'COL', 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png', '[]'::jsonb),
('mlb', 'Detroit Tigers', 'DET', 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png', '[]'::jsonb),
('mlb', 'Houston Astros', 'HOU', 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png', '[]'::jsonb),
('mlb', 'Kansas City Royals', 'KC', 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png', '[]'::jsonb),
('mlb', 'Los Angeles Angels', 'LAA', 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png', '[]'::jsonb),
('mlb', 'Los Angeles Dodgers', 'LAD', 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png', '[]'::jsonb),
('mlb', 'Miami Marlins', 'MIA', 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png', '[]'::jsonb),
('mlb', 'Milwaukee Brewers', 'MIL', 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png', '[]'::jsonb),
('mlb', 'Minnesota Twins', 'MIN', 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png', '[]'::jsonb),
('mlb', 'New York Mets', 'NYM', 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png', '[]'::jsonb),
('mlb', 'New York Yankees', 'NYY', 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png', '[]'::jsonb),
('mlb', 'Oakland Athletics', 'OAK', 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png', '[]'::jsonb),
('mlb', 'Philadelphia Phillies', 'PHI', 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png', '[]'::jsonb),
('mlb', 'Pittsburgh Pirates', 'PIT', 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png', '[]'::jsonb),
('mlb', 'San Diego Padres', 'SD', 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png', '[]'::jsonb),
('mlb', 'San Francisco Giants', 'SF', 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png', '[]'::jsonb),
('mlb', 'Seattle Mariners', 'SEA', 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png', '[]'::jsonb),
('mlb', 'St. Louis Cardinals', 'STL', 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png', '[]'::jsonb),
('mlb', 'Tampa Bay Rays', 'TB', 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png', '[]'::jsonb),
('mlb', 'Texas Rangers', 'TEX', 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png', '[]'::jsonb),
('mlb', 'Toronto Blue Jays', 'TOR', 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png', '[]'::jsonb),
('mlb', 'Washington Nationals', 'WSH', 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png', '[]'::jsonb)
ON CONFLICT (league, name) DO NOTHING;

-- Sportsbooks (shared across all leagues)
INSERT INTO sportsbooks_canonical (name, api_key) VALUES
('DraftKings', 'dk_api_key'),
('FanDuel', 'fd_api_key'),
('BetMGM', 'mgm_api_key'),
('Caesars', 'caesars_api_key'),
('PointsBet', 'pointsbet_api_key'),
('BetRivers', 'betrivers_api_key')
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- 5. INDEXES FOR PERFORMANCE
-- ==============================================

-- League-based indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_teams_canonical_league ON teams_canonical(league);
CREATE INDEX IF NOT EXISTS idx_players_canonical_league ON players_canonical(league);
CREATE INDEX IF NOT EXISTS idx_games_canonical_league ON games_canonical(league);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_league ON player_props_canonical(league);
CREATE INDEX IF NOT EXISTS idx_player_enriched_stats_league ON player_enriched_stats(league);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_league_market ON player_props_canonical(league, market);
CREATE INDEX IF NOT EXISTS idx_player_props_canonical_league_ev ON player_props_canonical(league, ev_percent);
CREATE INDEX IF NOT EXISTS idx_games_canonical_league_date ON games_canonical(league, game_date);

-- ==============================================
-- 6. GOLDEN DATASET TESTS (League-Agnostic)
-- ==============================================

-- Test harness for each league
CREATE TABLE IF NOT EXISTS golden_dataset (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    test_name TEXT NOT NULL,
    test_description TEXT,
    expected_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert test cases for each league
INSERT INTO golden_dataset (league, test_name, test_description, expected_result) VALUES
('nfl', 'team_resolution', 'Test NFL team resolution by abbreviation', '{"team_id": "not_null", "team_name": "Cincinnati Bengals"}'),
('nfl', 'player_props_view', 'Test NFL player props normalized view', '{"prop_count": ">0", "league": "nfl"}'),
('nba', 'team_resolution', 'Test NBA team resolution by abbreviation', '{"team_id": "not_null", "team_name": "Los Angeles Lakers"}'),
('nba', 'player_props_view', 'Test NBA player props normalized view', '{"prop_count": ">=0", "league": "nba"}'),
('mlb', 'team_resolution', 'Test MLB team resolution by abbreviation', '{"team_id": "not_null", "team_name": "Los Angeles Dodgers"}'),
('mlb', 'player_props_view', 'Test MLB player props normalized view', '{"prop_count": ">=0", "league": "mlb"}')
ON CONFLICT DO NOTHING;

-- ==============================================
-- 7. BULK UPSERT FUNCTION (League-Agnostic)
-- ==============================================

CREATE OR REPLACE FUNCTION bulk_upsert_player_props(
    props_data JSONB,
    batch_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    prop_record JSONB;
    team_id UUID;
    player_id UUID;
    game_id UUID;
    sportsbook_id UUID;
    upserted_count INTEGER := 0;
    error_count INTEGER := 0;
    errors TEXT[] := '{}';
BEGIN
    -- Process each prop in the batch
    FOR prop_record IN SELECT * FROM jsonb_array_elements(props_data)
    LOOP
        BEGIN
            -- Resolve team
            team_id := resolve_team_by_league(
                prop_record->>'team_abbrev',
                prop_record->>'league'
            );
            
            -- Resolve player
            player_id := resolve_player_by_league(
                prop_record->>'player_external_id',
                prop_record->>'league',
                team_id
            );
            
            -- Resolve game
            game_id := resolve_game_by_league(
                prop_record->>'api_game_id',
                prop_record->>'league'
            );
            
            -- Resolve sportsbook
            SELECT id INTO sportsbook_id 
            FROM sportsbooks_canonical 
            WHERE name = prop_record->>'sportsbook_name'
            AND is_active = true
            LIMIT 1;
            
            -- Upsert player prop
            INSERT INTO player_props_canonical (
                league,
                player_id,
                game_id,
                sportsbook_id,
                market,
                line,
                odds,
                ev_percent
            ) VALUES (
                prop_record->>'league',
                player_id,
                game_id,
                sportsbook_id,
                prop_record->>'market',
                (prop_record->>'line')::DECIMAL,
                (prop_record->>'odds')::INTEGER,
                (prop_record->>'ev_percent')::DECIMAL
            )
            ON CONFLICT DO NOTHING;
            
            upserted_count := upserted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            errors := array_append(errors, SQLERRM);
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'batch_id', batch_id,
        'upserted_count', upserted_count,
        'error_count', error_count,
        'errors', errors
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- This migration establishes:
-- ✅ League-agnostic canonical tables
-- ✅ Unified normalized view for all sports
-- ✅ League-aware resolution functions
-- ✅ NFL, NBA, MLB team seeding
-- ✅ Performance indexes
-- ✅ Golden dataset tests
-- ✅ Bulk upsert function
-- ✅ No more reinventing the wheel!

-- Next steps:
-- 1. Add NHL, WNBA teams when ready
-- 2. Extend to other components (leaderboards, social features)
-- 3. Add league-specific market types
-- 4. Implement league-specific analytics
