-- Update player_props_normalized view to include enrichment data
-- This joins the enrichment stats to show L5, L10, L20, streaks, and ratings

CREATE OR REPLACE VIEW player_props_normalized AS
SELECT 
    pp.id AS prop_id,
    pp.league,
    pp.league AS sport, -- Added for backward compatibility
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

    -- Opponent info (join through game's home/away team)
    CASE
        WHEN g.home_team_id = t.id THEN away_t.id
        ELSE home_t.id
    END AS opponent_id,
    CASE
        WHEN g.home_team_id = t.id THEN away_t.name
        ELSE home_t.name
    END AS opponent_name,
    CASE
        WHEN g.home_team_id = t.id THEN away_t.abbreviation
        ELSE home_t.abbreviation
    END AS opponent_abbrev,
    CASE
        WHEN g.home_team_id = t.id THEN away_t.logo_url
        ELSE home_t.logo_url
    END AS opponent_logo,

    -- Sportsbook info
    sb.id AS sportsbook_id,
    sb.name AS sportsbook_name,

    -- Game details
    g.season,
    g.week,

    -- Enrichment stats (from player_enriched_stats)
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
JOIN players_canonical p ON p.id = pp.player_id AND p.league = pp.league
JOIN teams_canonical t ON t.id = p.team_id AND t.league = pp.league
JOIN games_canonical g ON g.id = pp.game_id AND g.league = pp.league
JOIN teams_canonical home_t ON home_t.id = g.home_team_id AND home_t.league = g.league
JOIN teams_canonical away_t ON away_t.id = g.away_team_id AND away_t.league = g.league
JOIN sportsbooks_canonical sb ON sb.id = pp.sportsbook_id
LEFT JOIN player_enriched_stats es 
      ON es.player_id = pp.player_id 
      AND es.game_id = pp.game_id
      AND es.league = pp.league;
