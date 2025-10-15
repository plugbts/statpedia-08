-- Add sport field to player_props_normalized view for backward compatibility
-- This ensures existing services can filter by 'sport' while new architecture uses 'league'

-- Drop and recreate the view with sport field for backward compatibility
DROP VIEW IF EXISTS player_props_normalized CASCADE;

CREATE VIEW player_props_normalized AS
SELECT 
    pp.id AS prop_id,
    pp.league,
    pp.league AS sport,  -- Add sport field for backward compatibility
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

-- This migration ensures:
-- ✅ Backward compatibility: existing services can filter by 'sport'
-- ✅ Forward compatibility: new architecture can use 'league'
-- ✅ Both fields contain the same values (nfl, nba, mlb, nhl, wnba)
-- ✅ No breaking changes to existing frontend components
-- ✅ Seamless integration between old and new systems
