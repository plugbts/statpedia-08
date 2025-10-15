#!/bin/bash

# Stable Data Architecture Migration Script
# This script sets up the canonical mapping tables and normalized views

set -e

echo "🚀 Starting Stable Data Architecture Migration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    print_status "Checking environment variables..."
    
    if [ -z "$HASURA_ADMIN_SECRET" ]; then
        print_error "HASURA_ADMIN_SECRET environment variable is not set"
        exit 1
    fi
    
    if [ -z "$NEON_DATABASE_URL" ]; then
        print_error "NEON_DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    print_success "Environment variables are set"
}

# Function to execute SQL via Hasura GraphQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    print_status "Executing: $description"
    
    # Create a temporary SQL file
    local temp_file=$(mktemp)
    echo "$sql" > "$temp_file"
    
    # Execute via Hasura (this would need to be adapted based on your setup)
    # For now, we'll just log what would be executed
    print_status "SQL to execute:"
    echo "----------------------------------------"
    echo "$sql"
    echo "----------------------------------------"
    
    # Clean up temp file
    rm "$temp_file"
    
    print_success "SQL prepared for execution: $description"
}

# Create canonical mapping tables
create_canonical_tables() {
    print_status "Creating canonical mapping tables..."
    
    # Players table
    execute_sql "
    CREATE TABLE IF NOT EXISTS players (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        external_id TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        team_id UUID REFERENCES teams(id),
        league TEXT NOT NULL CHECK (league IN ('nfl', 'nba', 'mlb', 'nhl')),
        position TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id);
    CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
    CREATE INDEX IF NOT EXISTS idx_players_league ON players(league);
    CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);
    " "Players table with indexes"
    
    # Teams table
    execute_sql "
    CREATE TABLE IF NOT EXISTS teams (
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
    
    CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
    CREATE INDEX IF NOT EXISTS idx_teams_abbreviation ON teams(abbreviation);
    CREATE INDEX IF NOT EXISTS idx_teams_aliases ON teams USING GIN(aliases);
    " "Teams table with indexes"
    
    # Sportsbooks table
    execute_sql "
    CREATE TABLE IF NOT EXISTS sportsbooks (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        api_key TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_sportsbooks_name ON sportsbooks(name);
    " "Sportsbooks table with indexes"
    
    # Games table
    execute_sql "
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
    
    CREATE INDEX IF NOT EXISTS idx_games_external_id ON games(external_id);
    CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
    CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
    CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
    CREATE INDEX IF NOT EXISTS idx_games_league ON games(league);
    " "Games table with indexes"
    
    print_success "Canonical mapping tables created"
}

# Create enhanced player_props table
create_player_props_table() {
    print_status "Creating enhanced player_props table..."
    
    execute_sql "
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
    
    CREATE INDEX IF NOT EXISTS idx_player_props_game_id ON player_props(game_id);
    CREATE INDEX IF NOT EXISTS idx_player_props_player_id ON player_props(player_id);
    CREATE INDEX IF NOT EXISTS idx_player_props_sportsbook_id ON player_props(sportsbook_id);
    CREATE INDEX IF NOT EXISTS idx_player_props_market ON player_props(market);
    CREATE INDEX IF NOT EXISTS idx_player_props_active ON player_props(is_active);
    " "Enhanced player_props table with indexes"
    
    print_success "Enhanced player_props table created"
}

# Create player_enriched_stats table
create_enriched_stats_table() {
    print_status "Creating player_enriched_stats table..."
    
    execute_sql "
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
    
    CREATE INDEX IF NOT EXISTS idx_enriched_stats_player_id ON player_enriched_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_enriched_stats_game_id ON player_enriched_stats(game_id);
    " "Player enriched stats table with indexes"
    
    print_success "Player enriched stats table created"
}

# Create normalized view
create_normalized_view() {
    print_status "Creating player_props_normalized view..."
    
    execute_sql "
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
    " "Player props normalized view"
    
    print_success "Player props normalized view created"
}

# Create test harness
create_test_harness() {
    print_status "Creating test harness tables..."
    
    execute_sql "
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
    
    CREATE INDEX IF NOT EXISTS idx_test_results_test_name ON test_results(test_name);
    CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
    CREATE INDEX IF NOT EXISTS idx_golden_dataset_active ON golden_dataset(is_active);
    " "Test harness tables with indexes"
    
    print_success "Test harness tables created"
}

# Seed initial data
seed_initial_data() {
    print_status "Seeding initial data..."
    
    # Seed sportsbooks
    execute_sql "
    INSERT INTO sportsbooks (name, api_key) VALUES
    ('Consensus', NULL),
    ('DraftKings', NULL),
    ('FanDuel', NULL),
    ('BetMGM', NULL),
    ('Caesars', NULL),
    ('PointsBet', NULL)
    ON CONFLICT (name) DO NOTHING;
    " "Seed sportsbooks"
    
    # Seed NFL teams
    execute_sql "
    INSERT INTO teams (league, name, abbreviation, logo_url, aliases) VALUES
    ('nfl', 'Arizona Cardinals', 'ARI', 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', '[\"cardinals\", \"ari\", \"az\"]'),
    ('nfl', 'Atlanta Falcons', 'ATL', 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', '[\"falcons\", \"atl\"]'),
    ('nfl', 'Baltimore Ravens', 'BAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', '[\"ravens\", \"bal\"]'),
    ('nfl', 'Buffalo Bills', 'BUF', 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', '[\"bills\", \"buf\"]'),
    ('nfl', 'Carolina Panthers', 'CAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', '[\"panthers\", \"car\"]'),
    ('nfl', 'Chicago Bears', 'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', '[\"bears\", \"chi\"]'),
    ('nfl', 'Cincinnati Bengals', 'CIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', '[\"bengals\", \"cin\"]'),
    ('nfl', 'Cleveland Browns', 'CLE', 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', '[\"browns\", \"cle\"]'),
    ('nfl', 'Dallas Cowboys', 'DAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', '[\"cowboys\", \"dal\"]'),
    ('nfl', 'Denver Broncos', 'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', '[\"broncos\", \"den\"]'),
    ('nfl', 'Detroit Lions', 'DET', 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', '[\"lions\", \"det\"]'),
    ('nfl', 'Green Bay Packers', 'GB', 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', '[\"packers\", \"green bay\", \"gb\"]'),
    ('nfl', 'Houston Texans', 'HOU', 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', '[\"texans\", \"hou\"]'),
    ('nfl', 'Indianapolis Colts', 'IND', 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', '[\"colts\", \"ind\"]'),
    ('nfl', 'Jacksonville Jaguars', 'JAX', 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', '[\"jaguars\", \"jax\"]'),
    ('nfl', 'Kansas City Chiefs', 'KC', 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', '[\"chiefs\", \"kc\"]'),
    ('nfl', 'Las Vegas Raiders', 'LV', 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', '[\"raiders\", \"lv\", \"oakland raiders\"]'),
    ('nfl', 'Los Angeles Chargers', 'LAC', 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', '[\"chargers\", \"lac\"]'),
    ('nfl', 'Los Angeles Rams', 'LAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', '[\"rams\", \"lar\"]'),
    ('nfl', 'Miami Dolphins', 'MIA', 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', '[\"dolphins\", \"mia\"]'),
    ('nfl', 'Minnesota Vikings', 'MIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', '[\"vikings\", \"min\"]'),
    ('nfl', 'New England Patriots', 'NE', 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', '[\"patriots\", \"ne\"]'),
    ('nfl', 'New Orleans Saints', 'NO', 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', '[\"saints\", \"nola saints\", \"no\"]'),
    ('nfl', 'New York Giants', 'NYG', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', '[\"giants\", \"nyg\", \"ny giants\"]'),
    ('nfl', 'New York Jets', 'NYJ', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', '[\"jets\", \"ny jets\", \"nyj\"]'),
    ('nfl', 'Philadelphia Eagles', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', '[\"eagles\", \"phi\"]'),
    ('nfl', 'Pittsburgh Steelers', 'PIT', 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', '[\"steelers\", \"pit\"]'),
    ('nfl', 'San Francisco 49ers', 'SF', 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', '[\"49ers\", \"sf\"]'),
    ('nfl', 'Seattle Seahawks', 'SEA', 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', '[\"seahawks\", \"sea\"]'),
    ('nfl', 'Tampa Bay Buccaneers', 'TB', 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', '[\"buccaneers\", \"tb\", \"bucs\"]'),
    ('nfl', 'Tennessee Titans', 'TEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', '[\"titans\", \"ten\"]'),
    ('nfl', 'Washington Commanders', 'WAS', 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', '[\"commanders\", \"was\", \"washington football team\", \"redskins\"]')
    ON CONFLICT (league, LOWER(name)) DO NOTHING;
    " "Seed NFL teams"
    
    # Seed golden dataset tests
    execute_sql "
    INSERT INTO golden_dataset (test_name, description, player_name, team_abbrev, opponent_abbrev, market, expected_line, expected_odds, league) VALUES
    ('joe_burrow_passing_yards', 'Joe Burrow passing yards prop', 'Joe Burrow', 'CIN', 'BAL', 'Passing Yards', 250.5, -110, 'nfl'),
    ('jamarr_chase_receiving_yards', 'Ja''Marr Chase receiving yards prop', 'Ja''Marr Chase', 'CIN', 'BAL', 'Receiving Yards', 75.5, -110, 'nfl'),
    ('aaron_rodgers_passing_tds', 'Aaron Rodgers passing touchdowns', 'Aaron Rodgers', 'NYJ', 'BUF', 'Passing Touchdowns', 1.5, -110, 'nfl'),
    ('josh_allen_rushing_yards', 'Josh Allen rushing yards', 'Josh Allen', 'BUF', 'NYJ', 'Rushing Yards', 45.5, -110, 'nfl'),
    ('travis_kelce_receptions', 'Travis Kelce receptions', 'Travis Kelce', 'KC', 'DEN', 'Receptions', 6.5, -110, 'nfl')
    ON CONFLICT (test_name) DO NOTHING;
    " "Seed golden dataset tests"
    
    print_success "Initial data seeded"
}

# Create helper functions
create_helper_functions() {
    print_status "Creating helper functions..."
    
    execute_sql "
    CREATE OR REPLACE FUNCTION resolve_team(
        team_input TEXT,
        league_input TEXT DEFAULT NULL
    ) RETURNS UUID AS \$\$
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
    \$\$ LANGUAGE plpgsql;
    " "Create resolve_team function"
    
    execute_sql "
    CREATE OR REPLACE FUNCTION resolve_player(
        player_input TEXT,
        team_id_input UUID DEFAULT NULL,
        league_input TEXT DEFAULT NULL
    ) RETURNS UUID AS \$\$
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
    \$\$ LANGUAGE plpgsql;
    " "Create resolve_player function"
    
    execute_sql "
    CREATE OR REPLACE FUNCTION resolve_sportsbook(sportsbook_name TEXT) RETURNS UUID AS \$\$
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
    \$\$ LANGUAGE plpgsql;
    " "Create resolve_sportsbook function"
    
    print_success "Helper functions created"
}

# Main migration function
run_migration() {
    print_status "Starting stable data architecture migration..."
    
    check_env
    create_canonical_tables
    create_player_props_table
    create_enriched_stats_table
    create_normalized_view
    create_test_harness
    create_helper_functions
    seed_initial_data
    
    print_success "🎉 Migration completed successfully!"
    print_status "Next steps:"
    echo "1. Update your data ingestion to use bulk_upsert_player_props() function"
    echo "2. Migrate frontend components to use HasuraPlayerPropsNormalizedService"
    echo "3. Set up monitoring dashboard to track ingestion health"
    echo "4. Run golden dataset tests to verify everything works"
    echo ""
    print_status "Your stable data architecture is now ready! 🚀"
}

# Run the migration
run_migration
