-- Migration: Create Resolution Functions and Test Harness
-- Database: Neon PostgreSQL via Hasura
-- Purpose: Create helper functions and test infrastructure for stable data architecture

-- Create resolution functions
CREATE OR REPLACE FUNCTION resolve_team_canonical(
    team_input TEXT,
    league_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    team_id UUID;
BEGIN
    SELECT id INTO team_id 
    FROM teams_canonical 
    WHERE UPPER(abbreviation) = UPPER(team_input)
    AND (league_input IS NULL OR league = league_input)
    AND is_active = true
    LIMIT 1;
    
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams_canonical 
        WHERE LOWER(name) = LOWER(team_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams_canonical 
        WHERE aliases ? LOWER(team_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN team_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_player_canonical(
    player_input TEXT,
    team_id_input UUID DEFAULT NULL,
    league_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    player_id UUID;
BEGIN
    SELECT id INTO player_id 
    FROM players_canonical 
    WHERE external_id = player_input
    AND (team_id_input IS NULL OR team_id = team_id_input)
    AND (league_input IS NULL OR league = league_input)
    AND is_active = true
    LIMIT 1;
    
    IF player_id IS NULL THEN
        SELECT id INTO player_id 
        FROM players_canonical 
        WHERE LOWER(display_name) = LOWER(player_input)
        AND (team_id_input IS NULL OR team_id = team_id_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN player_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_sportsbook_canonical(sportsbook_name TEXT) RETURNS UUID AS $$
DECLARE
    sportsbook_id UUID;
BEGIN
    SELECT id INTO sportsbook_id 
    FROM sportsbooks_canonical 
    WHERE LOWER(name) = LOWER(sportsbook_name)
    AND is_active = true
    LIMIT 1;
    
    RETURN sportsbook_id;
END;
$$ LANGUAGE plpgsql;

-- Create bulk upsert function for player props
CREATE OR REPLACE FUNCTION bulk_upsert_player_props(
    props_data JSONB,
    batch_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    prop_record JSONB;
    game_id UUID;
    player_id UUID;
    sportsbook_id UUID;
    result JSONB := '{"success": true, "inserted": 0, "updated": 0, "errors": []}'::jsonb;
    error_count INTEGER := 0;
BEGIN
    -- Process each prop in the batch
    FOR prop_record IN SELECT * FROM jsonb_array_elements(props_data)
    LOOP
        BEGIN
            -- Resolve IDs
            game_id := (prop_record->>'game_id')::UUID;
            player_id := (prop_record->>'player_id')::UUID;
            sportsbook_id := (prop_record->>'sportsbook_id')::UUID;
            
            -- Insert or update the prop
            INSERT INTO player_props_canonical (
                game_id, player_id, sportsbook_id, market, line, odds, ev_percent
            ) VALUES (
                game_id,
                player_id,
                sportsbook_id,
                prop_record->>'market',
                (prop_record->>'line')::DECIMAL(10,2),
                (prop_record->>'odds')::INTEGER,
                (prop_record->>'ev_percent')::DECIMAL(5,2)
            )
            ON CONFLICT (game_id, player_id, sportsbook_id, market, line) 
            DO UPDATE SET
                odds = EXCLUDED.odds,
                ev_percent = EXCLUDED.odds,
                updated_at = now();
            
            -- Update success count
            result := jsonb_set(result, '{inserted}', to_jsonb((result->>'inserted')::INTEGER + 1));
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error and continue
            error_count := error_count + 1;
            result := jsonb_set(result, '{errors}', 
                (result->'errors') || jsonb_build_array(SQLERRM));
        END;
    END LOOP;
    
    -- Update error count
    result := jsonb_set(result, '{error_count}', to_jsonb(error_count));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create test harness tables
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

-- Create indexes for test tables
CREATE INDEX IF NOT EXISTS idx_test_results_test_name ON test_results(test_name);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_golden_dataset_active ON golden_dataset(is_active);

-- Seed golden dataset tests
INSERT INTO golden_dataset (test_name, description, player_name, team_abbrev, opponent_abbrev, market, expected_line, expected_odds, league) VALUES
('joe_burrow_passing_yards', 'Joe Burrow passing yards prop', 'Joe Burrow', 'CIN', 'BAL', 'Passing Yards', 250.5, -110, 'nfl'),
('jamarr_chase_receiving_yards', 'Ja''Marr Chase receiving yards prop', 'Ja''Marr Chase', 'CIN', 'BAL', 'Receiving Yards', 75.5, -110, 'nfl'),
('aaron_rodgers_passing_tds', 'Aaron Rodgers passing touchdowns', 'Aaron Rodgers', 'NYJ', 'BUF', 'Passing Touchdowns', 1.5, -110, 'nfl'),
('josh_allen_rushing_yards', 'Josh Allen rushing yards', 'Josh Allen', 'BUF', 'NYJ', 'Rushing Yards', 45.5, -110, 'nfl'),
('travis_kelce_receptions', 'Travis Kelce receptions', 'Travis Kelce', 'KC', 'DEN', 'Receptions', 6.5, -110, 'nfl')
ON CONFLICT (test_name) DO NOTHING;
