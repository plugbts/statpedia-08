-- Player Props Normalized View
-- This view provides a stable, normalized interface for the frontend
-- All player names, team logos, and odds flow from canonical mapping tables

CREATE OR REPLACE VIEW player_props_normalized AS
SELECT 
    -- Core prop information
    pp.id AS prop_id,
    pp.game_id,
    g.game_date,
    pp.market,
    pp.line,
    pp.odds,
    pp.ev_percent,
    
    -- Player information (canonical)
    p.id AS player_id,
    p.display_name AS player_name,
    p.external_id AS api_player_id,
    p.position,
    
    -- Team information (canonical)
    t.id AS team_id,
    t.name AS team_name,
    t.abbreviation AS team_abbrev,
    t.logo_url AS team_logo,
    
    -- Opponent information (canonical)
    ot.id AS opponent_id,
    ot.name AS opponent_name,
    ot.abbreviation AS opponent_abbrev,
    ot.logo_url AS opponent_logo,
    
    -- Sportsbook information (canonical)
    sb.id AS sportsbook_id,
    sb.name AS sportsbook_name,
    
    -- Game information
    g.league AS sport,
    g.season,
    g.week,
    
    -- Enrichment stats (if available)
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

-- Grant permissions on the view
GRANT SELECT ON player_props_normalized TO authenticated;
GRANT SELECT ON player_props_normalized TO anon;

-- Create indexes on the underlying tables for better view performance
CREATE INDEX IF NOT EXISTS idx_player_props_normalized_lookup 
    ON player_props(game_id, player_id, sportsbook_id, market);

CREATE INDEX IF NOT EXISTS idx_games_date_league 
    ON games(game_date, league);

-- Helper function to resolve team by name or abbreviation
CREATE OR REPLACE FUNCTION resolve_team(
    team_input TEXT,
    league_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    team_id UUID;
BEGIN
    -- First try exact abbreviation match
    SELECT id INTO team_id 
    FROM teams 
    WHERE UPPER(abbreviation) = UPPER(team_input)
    AND (league_input IS NULL OR league = league_input)
    AND is_active = true
    LIMIT 1;
    
    -- If not found, try name match
    IF team_id IS NULL THEN
        SELECT id INTO team_id 
        FROM teams 
        WHERE LOWER(name) = LOWER(team_input)
        AND (league_input IS NULL OR league = league_input)
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- If still not found, try aliases
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

-- Helper function to resolve player by external ID or name
CREATE OR REPLACE FUNCTION resolve_player(
    player_input TEXT,
    team_id_input UUID DEFAULT NULL,
    league_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    player_id UUID;
BEGIN
    -- First try external_id match
    SELECT id INTO player_id 
    FROM players 
    WHERE external_id = player_input
    AND (team_id_input IS NULL OR team_id = team_id_input)
    AND (league_input IS NULL OR league = league_input)
    AND is_active = true
    LIMIT 1;
    
    -- If not found, try display_name match
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

-- Helper function to resolve sportsbook by name
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

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION resolve_team(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_team(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_player(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_player(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_sportsbook(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_sportsbook(TEXT) TO service_role;
