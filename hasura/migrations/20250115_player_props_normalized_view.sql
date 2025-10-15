-- Migration: Create Player Props Normalized View
-- Database: Neon PostgreSQL via Hasura
-- Purpose: Create normalized view that joins all canonical tables for stable data

-- Create the normalized view
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
    
    NULL AS streak,
    NULL AS rating,
    NULL AS matchup_rank,
    NULL AS l5,
    NULL AS l10,
    NULL AS l20,
    
    pp.is_active,
    pp.created_at,
    pp.updated_at
    
FROM player_props_canonical pp
JOIN players_canonical p ON p.id = pp.player_id
JOIN games_canonical g ON g.id = pp.game_id
JOIN teams_canonical t ON t.id = p.team_id
JOIN teams_canonical ot ON ot.id = CASE 
    WHEN g.home_team_id = p.team_id THEN g.away_team_id 
    ELSE g.home_team_id 
END
JOIN sportsbooks_canonical sb ON sb.id = pp.sportsbook_id
WHERE pp.is_active = true
    AND p.is_active = true
    AND t.is_active = true
    AND ot.is_active = true
    AND sb.is_active = true
    AND g.is_active = true;
