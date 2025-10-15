#!/bin/bash

# Schema Fix Script for Stable Data Architecture
# This script fixes the existing database schema to match our canonical structure

set -e

echo "🔧 Starting Schema Fix for Stable Data Architecture..."

# Check environment variables
if [ -z "$HASURA_ADMIN_SECRET" ]; then
    echo "❌ HASURA_ADMIN_SECRET environment variable is not set"
    exit 1
fi

if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ NEON_DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ Environment variables are set"

# Create a temporary SQL file for schema fixes
cat > /tmp/schema_fix.sql << 'EOF'
-- Schema Fix for Stable Data Architecture
-- Update existing tables to match canonical structure

-- 1. Fix teams table to add league column and aliases
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]'::jsonb;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add constraints
ALTER TABLE teams ADD CONSTRAINT IF NOT EXISTS teams_league_check 
    CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl'));

-- 2. Fix players table to add missing columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update display_name to use name if not set
UPDATE players SET display_name = name WHERE display_name IS NULL;

-- 3. Create sportsbooks table if it doesn't exist
CREATE TABLE IF NOT EXISTS sportsbooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create games table with proper structure
CREATE TABLE IF NOT EXISTS games (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT NOT NULL UNIQUE,
    home_team_id UUID NOT NULL REFERENCES teams(id),
    away_team_id UUID NOT NULL REFERENCES teams(id),
    league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
    game_date TIMESTAMP WITH TIME ZONE NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create player_props table with canonical structure
CREATE TABLE IF NOT EXISTS player_props (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id),
    player_id UUID NOT NULL REFERENCES players(id),
    sportsbook_id UUID NOT NULL REFERENCES sportsbooks(id),
    market TEXT NOT NULL,
    line DECIMAL(10,2) NOT NULL,
    odds INTEGER,
    ev_percent DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(game_id, player_id, sportsbook_id, market, line)
);

-- 6. Create player_enriched_stats table
CREATE TABLE IF NOT EXISTS player_enriched_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id),
    game_id UUID NOT NULL REFERENCES games(id),
    streak TEXT,
    rating DECIMAL(5,2),
    matchup_rank INTEGER,
    l5 DECIMAL(5,2),
    l10 DECIMAL(5,2),
    l20 DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(player_id, game_id)
);

-- 7. Create the normalized view
CREATE OR REPLACE VIEW player_props_normalized AS
SELECT 
    pp.id AS prop_id,
    pp.game_id,
    g.game_date,
    pp.market,
    pp.line,
    pp.odds,
    pp.ev_percent,
    
    p.id AS player_id,
    p.display_name AS player_name,
    p.external_id AS api_player_id,
    p.position,
    
    t.id AS team_id,
    t.name AS team_name,
    t.abbreviation AS team_abbrev,
    t.logo_url AS team_logo,
    
    ot.id AS opponent_id,
    ot.name AS opponent_name,
    ot.abbreviation AS opponent_abbrev,
    ot.logo_url AS opponent_logo,
    
    sb.id AS sportsbook_id,
    sb.name AS sportsbook_name,
    
    g.league AS sport,
    g.season,
    g.week,
    
    es.streak,
    es.rating,
    es.matchup_rank,
    es.l5,
    es.l10,
    es.l20,
    
    pp.is_active,
    pp.created_at,
    pp.updated_at
    
FROM player_props pp
JOIN players p ON p.id = pp.player_id
JOIN games g ON g.id = pp.game_id
JOIN teams t ON t.id = p.team_id
JOIN teams ot ON ot.id = CASE 
    WHEN g.home_team_id = p.team_id THEN g.away_team_id 
    ELSE g.home_team_id 
END
JOIN sportsbooks sb ON sb.id = pp.sportsbook_id
LEFT JOIN player_enriched_stats es 
    ON es.player_id = pp.player_id 
    AND es.game_id = pp.game_id
WHERE pp.is_active = true
    AND p.is_active = true
    AND t.is_active = true
    AND ot.is_active = true
    AND sb.is_active = true
    AND g.is_active = true;

-- 8. Create test harness tables
CREATE TABLE IF NOT EXISTS golden_dataset (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name TEXT NOT NULL UNIQUE,
    description TEXT,
    player_name TEXT NOT NULL,
    team_abbrev TEXT NOT NULL,
    opponent_abbrev TEXT NOT NULL,
    market TEXT NOT NULL,
    expected_line DECIMAL(10,2),
    expected_odds INTEGER,
    league TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name TEXT NOT NULL,
    test_status TEXT NOT NULL CHECK (test_status IN ('passed', 'failed', 'error')),
    error_message TEXT,
    execution_time_ms INTEGER,
    props_found INTEGER DEFAULT 0,
    props_missing INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Create helper functions
CREATE OR REPLACE FUNCTION resolve_team(
    team_input TEXT,
    league_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    team_id UUID;
BEGIN
    SELECT id INTO team_id 
    FROM teams 
    WHERE UPPER(abbreviation) = UPPER(team_input)
    AND (league_input IS NULL OR league = league_input)
    AND is_active = true
    LIMIT 1;
    
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams 
        WHERE LOWER(name) = LOWER(team_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams 
        WHERE aliases ? LOWER(team_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN team_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_player(
    player_input TEXT,
    team_id_input UUID DEFAULT NULL,
    league_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    player_id UUID;
BEGIN
    SELECT id INTO player_id 
    FROM players 
    WHERE external_id = player_input
    AND (team_id_input IS NULL OR team_id = team_id_input)
    AND (league_input IS NULL OR league = league_input)
    AND is_active = true
    LIMIT 1;
    
    IF player_id IS NULL THEN
        SELECT id INTO player_id 
        FROM players 
        WHERE LOWER(display_name) = LOWER(player_input)
        AND (team_id_input IS NULL OR team_id = team_id_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN player_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_sportsbook(sportsbook_name TEXT) RETURNS UUID AS $$
DECLARE
    sportsbook_id UUID;
BEGIN
    SELECT id INTO sportsbook_id 
    FROM sportsbooks 
    WHERE LOWER(name) = LOWER(sportsbook_name)
    AND is_active = true
    LIMIT 1;
    
    RETURN sportsbook_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Seed initial data
INSERT INTO sportsbooks (name, api_key) VALUES
('Consensus', NULL),
('DraftKings', NULL),
('FanDuel', NULL),
('BetMGM', NULL),
('Caesars', NULL),
('PointsBet', NULL)
ON CONFLICT (name) DO NOTHING;

-- Update existing teams with league information
UPDATE teams SET league = 'nfl' WHERE abbreviation IN ('ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS');

-- Add NFL team logos and aliases
UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
    aliases = '["cardinals", "ari", "az"]'::jsonb
WHERE abbreviation = 'ARI' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
    aliases = '["falcons", "atl"]'::jsonb
WHERE abbreviation = 'ATL' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
    aliases = '["ravens", "bal"]'::jsonb
WHERE abbreviation = 'BAL' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
    aliases = '["bills", "buf"]'::jsonb
WHERE abbreviation = 'BUF' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
    aliases = '["panthers", "car"]'::jsonb
WHERE abbreviation = 'CAR' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
    aliases = '["bears", "chi"]'::jsonb
WHERE abbreviation = 'CHI' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
    aliases = '["bengals", "cin"]'::jsonb
WHERE abbreviation = 'CIN' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
    aliases = '["browns", "cle"]'::jsonb
WHERE abbreviation = 'CLE' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
    aliases = '["cowboys", "dal"]'::jsonb
WHERE abbreviation = 'DAL' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
    aliases = '["broncos", "den"]'::jsonb
WHERE abbreviation = 'DEN' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
    aliases = '["lions", "det"]'::jsonb
WHERE abbreviation = 'DET' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
    aliases = '["packers", "green bay", "gb"]'::jsonb
WHERE abbreviation = 'GB' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
    aliases = '["texans", "hou"]'::jsonb
WHERE abbreviation = 'HOU' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
    aliases = '["colts", "ind"]'::jsonb
WHERE abbreviation = 'IND' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
    aliases = '["jaguars", "jax"]'::jsonb
WHERE abbreviation = 'JAX' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
    aliases = '["chiefs", "kc"]'::jsonb
WHERE abbreviation = 'KC' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
    aliases = '["raiders", "lv", "oakland raiders"]'::jsonb
WHERE abbreviation = 'LV' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
    aliases = '["chargers", "lac"]'::jsonb
WHERE abbreviation = 'LAC' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
    aliases = '["rams", "lar"]'::jsonb
WHERE abbreviation = 'LAR' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
    aliases = '["dolphins", "mia"]'::jsonb
WHERE abbreviation = 'MIA' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
    aliases = '["vikings", "min"]'::jsonb
WHERE abbreviation = 'MIN' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
    aliases = '["patriots", "ne"]'::jsonb
WHERE abbreviation = 'NE' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
    aliases = '["saints", "nola saints", "no"]'::jsonb
WHERE abbreviation = 'NO' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
    aliases = '["giants", "nyg", "ny giants"]'::jsonb
WHERE abbreviation = 'NYG' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
    aliases = '["jets", "ny jets", "nyj"]'::jsonb
WHERE abbreviation = 'NYJ' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
    aliases = '["eagles", "phi"]'::jsonb
WHERE abbreviation = 'PHI' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
    aliases = '["steelers", "pit"]'::jsonb
WHERE abbreviation = 'PIT' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
    aliases = '["49ers", "sf"]'::jsonb
WHERE abbreviation = 'SF' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
    aliases = '["seahawks", "sea"]'::jsonb
WHERE abbreviation = 'SEA' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
    aliases = '["buccaneers", "tb", "bucs"]'::jsonb
WHERE abbreviation = 'TB' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
    aliases = '["titans", "ten"]'::jsonb
WHERE abbreviation = 'TEN' AND league = 'nfl';

UPDATE teams SET 
    logo_url = 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png',
    aliases = '["commanders", "was", "washington football team", "redskins"]'::jsonb
WHERE abbreviation = 'WAS' AND league = 'nfl';

-- Seed golden dataset tests
INSERT INTO golden_dataset (test_name, description, player_name, team_abbrev, opponent_abbrev, market, expected_line, expected_odds, league) VALUES
('joe_burrow_passing_yards', 'Joe Burrow passing yards prop', 'Joe Burrow', 'CIN', 'BAL', 'Passing Yards', 250.5, -110, 'nfl'),
('jamarr_chase_receiving_yards', 'Ja''Marr Chase receiving yards prop', 'Ja''Marr Chase', 'CIN', 'BAL', 'Receiving Yards', 75.5, -110, 'nfl'),
('aaron_rodgers_passing_tds', 'Aaron Rodgers passing touchdowns', 'Aaron Rodgers', 'NYJ', 'BUF', 'Passing Touchdowns', 1.5, -110, 'nfl'),
('josh_allen_rushing_yards', 'Josh Allen rushing yards', 'Josh Allen', 'BUF', 'NYJ', 'Rushing Yards', 45.5, -110, 'nfl'),
('travis_kelce_receptions', 'Travis Kelce receptions', 'Travis Kelce', 'KC', 'DEN', 'Receptions', 6.5, -110, 'nfl')
ON CONFLICT (test_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
CREATE INDEX IF NOT EXISTS idx_teams_abbreviation ON teams(abbreviation);
CREATE INDEX IF NOT EXISTS idx_teams_aliases ON teams USING GIN(aliases);
CREATE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_league ON players(league);
CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);
CREATE INDEX IF NOT EXISTS idx_games_external_id ON games(external_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_league ON games(league);
CREATE INDEX IF NOT EXISTS idx_player_props_game_id ON player_props(game_id);
CREATE INDEX IF NOT EXISTS idx_player_props_player_id ON player_props(player_id);
CREATE INDEX IF NOT EXISTS idx_player_props_sportsbook_id ON player_props(sportsbook_id);
CREATE INDEX IF NOT EXISTS idx_player_props_market ON player_props(market);
CREATE INDEX IF NOT EXISTS idx_player_props_active ON player_props(is_active);

EOF

echo "📝 Executing schema fixes..."

# Execute the schema fix
psql "$NEON_DATABASE_URL" -f /tmp/schema_fix.sql

echo "✅ Schema fixes completed successfully!"

# Clean up
rm -f /tmp/schema_fix.sql

echo "🎉 Stable Data Architecture schema is now ready!"
echo ""
echo "📋 What was fixed:"
echo "✅ Teams table updated with league column and aliases"
echo "✅ Players table updated with external_id and display_name"
echo "✅ Sportsbooks table created and seeded"
echo "✅ Games table created with proper structure"
echo "✅ Player_props table created with canonical structure"
echo "✅ Player_props_normalized view created"
echo "✅ Resolution functions created"
echo "✅ Golden dataset tests seeded"
echo "✅ Performance indexes created"
echo ""
echo "🚀 Next step: Update Hasura metadata to expose the normalized view"
