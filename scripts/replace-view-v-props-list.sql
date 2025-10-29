DO $$
BEGIN
  -- Try to drop dependent views safely
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS public.v_props_list CASCADE';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop view v_props_list directly: %', SQLERRM;
  END;
END$$;

-- Replace view v_props_list with enhanced version
-- Fixes syntax errors, adds team/opponent abbreviation resolution,
-- ESPN logos, and analytics fields with fallbacks
-- Compatible with Postgres 15

CREATE OR REPLACE VIEW public.v_props_list AS
WITH
  -- Derive league_code and season once for reuse
  league_info AS (
    SELECT
      g.id AS game_id,
      LOWER(COALESCE(l.abbreviation, l.code)) AS league_code,
      EXTRACT(YEAR FROM g.game_date)::text AS season
    FROM public.games g
    JOIN public.leagues l ON l.id = g.league_id
  ),
  -- Derive opponent from player_enriched_stats subquery
  opponent_from_pes AS (
    SELECT DISTINCT ON (pes_sub.player_id, pes_sub.game_id)
      pes_sub.player_id,
      pes_sub.game_id,
      t_opp.abbreviation AS abbreviation
    FROM public.player_enriched_stats pes_sub
    LEFT JOIN public.teams t_opp ON t_opp.id = pes_sub.opponent_team_id
    WHERE pes_sub.opponent_team_id IS NOT NULL
  )
SELECT
  pp.id,
  -- full_name with fallback
  COALESCE(p.full_name, p.name) AS full_name,
  
  -- team_abbrev with priority resolution
  COALESCE(
    t.abbreviation,
    t_pgl.abbreviation,
    CASE
      WHEN g.home_team_id = p.team_id THEN th.abbreviation
      WHEN g.away_team_id = p.team_id THEN ta.abbreviation
      ELSE NULL
    END
  ) AS team_abbrev,
  
  -- opponent_abbrev with priority resolution
  COALESCE(
    opp.abbreviation,
    t_pgl_opp.abbreviation,
    CASE
      WHEN g.home_team_id = p.team_id THEN ta.abbreviation
      WHEN g.away_team_id = p.team_id THEN th.abbreviation
      ELSE NULL
    END
  ) AS opponent_abbrev,
  
  -- team and opponent for backward compatibility
  COALESCE(
    t.abbreviation,
    t_pgl.abbreviation,
    CASE
      WHEN g.home_team_id = p.team_id THEN th.abbreviation
      WHEN g.away_team_id = p.team_id THEN ta.abbreviation
      ELSE NULL
    END
  ) AS team,
  COALESCE(
    opp.abbreviation,
    t_pgl_opp.abbreviation,
    CASE
      WHEN g.home_team_id = p.team_id THEN ta.abbreviation
      WHEN g.away_team_id = p.team_id THEN th.abbreviation
      ELSE NULL
    END
  ) AS opponent,
  
  -- ESPN team logo (NFL/NBA/MLB/NHL only)
  CASE
    WHEN li.league_code IN ('nfl', 'nba', 'mlb', 'nhl') THEN
      format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', 
             li.league_code,
             LOWER(COALESCE(
               t.abbreviation,
               t_pgl.abbreviation,
               CASE
                 WHEN g.home_team_id = p.team_id THEN th.abbreviation
                 WHEN g.away_team_id = p.team_id THEN ta.abbreviation
                 ELSE NULL
               END
             )))
    ELSE NULL
  END AS team_logo,
  
  -- ESPN opponent logo (NFL/NBA/MLB/NHL only)
  CASE
    WHEN li.league_code IN ('nfl', 'nba', 'mlb', 'nhl') THEN
      format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png',
             li.league_code,
             LOWER(COALESCE(
               opp.abbreviation,
               t_pgl_opp.abbreviation,
               CASE
                 WHEN g.home_team_id = p.team_id THEN ta.abbreviation
                 WHEN g.away_team_id = p.team_id THEN th.abbreviation
                 ELSE NULL
               END
             )))
    ELSE NULL
  END AS opponent_logo,
  
  -- prop fields
  pt.name AS market,
  pp.line,
  COALESCE(pp.odds_american, 
    CASE WHEN pp.odds ~ '^[+-]\\d+$' 
         THEN CAST(REPLACE(pp.odds, '+', '') AS INT) 
         ELSE NULL 
    END
  ) AS odds_american,
  pp.over_odds_american,
  pp.under_odds_american,
  
  -- analytics fields with fallbacks (pes first, then pa_ev)
  COALESCE(pes.ev_percent::numeric(8,3), pa_ev.ev_percent::numeric(8,3)) AS ev_percent,
  COALESCE(pes.l5, pa_ev.l5) AS l5,
  COALESCE(pes.l10, pa_ev.l10) AS l10,
  COALESCE(pes.l20, pa_ev.l20) AS l20,
  COALESCE(pes.h2h_avg, pa_ev.h2h_avg) AS h2h_avg,
  COALESCE(pes.season_avg, pa_ev.season_avg) AS season_avg,
  COALESCE(pes.matchup_rank, pa_ev.matchup_rank) AS matchup_rank,
  pes.rating AS rating,
  COALESCE(pes.streak_l5, 0) AS current_streak,
  
  -- legacy analytics fields for backward compatibility
  pes.streak_l5,
  
  -- league and game_date
  COALESCE(l.abbreviation, l.code)::text AS league,
  g.game_date

FROM public.player_props pp
JOIN public.players p ON p.id = pp.player_id
JOIN public.prop_types pt ON pt.id = pp.prop_type_id
JOIN public.games g ON g.id = pp.game_id
JOIN public.leagues l ON l.id = g.league_id
JOIN league_info li ON li.game_id = g.id

-- Direct team (t) from player's team_id
LEFT JOIN public.teams t ON t.id = p.team_id

-- Teams from game (th = home, ta = away)
LEFT JOIN public.teams th ON th.id = g.home_team_id
LEFT JOIN public.teams ta ON ta.id = g.away_team_id

-- Team via player_game_logs (t_pgl)
LEFT JOIN LATERAL (
  SELECT DISTINCT t_pgl_sub.abbreviation
  FROM public.player_game_logs pgl_sub
  JOIN public.teams t_pgl_sub ON t_pgl_sub.id = pgl_sub.team_id
  WHERE pgl_sub.player_id = pp.player_id
    AND pgl_sub.game_id = pp.game_id
  LIMIT 1
) t_pgl ON true

-- Opponent team via player_enriched_stats (opp)
LEFT JOIN opponent_from_pes opp
  ON opp.player_id = pp.player_id
  AND opp.game_id = pp.game_id

-- Opponent team via player_game_logs (t_pgl_opp)
LEFT JOIN LATERAL (
  SELECT DISTINCT t_opp_sub.abbreviation
  FROM public.player_game_logs pgl_opp_sub
  JOIN public.teams t_opp_sub ON t_opp_sub.id = pgl_opp_sub.opponent_team_id
  WHERE pgl_opp_sub.player_id = pp.player_id
    AND pgl_opp_sub.game_id = pp.game_id
  LIMIT 1
) t_pgl_opp ON true

-- player_enriched_stats for analytics
LEFT JOIN public.player_enriched_stats pes
  ON pes.player_id = pp.player_id
  AND pes.game_id = pp.game_id

-- player_analytics exact season join
LEFT JOIN public.player_analytics pa_exact
  ON pa_exact.player_id = pp.player_id
  AND pa_exact.prop_type = pt.name
  AND pa_exact.season = li.season

-- player_analytics latest season fallback (only if no exact match)
LEFT JOIN LATERAL (
  SELECT pa2.*
  FROM public.player_analytics pa2
  WHERE pa2.player_id = pp.player_id
    AND pa2.prop_type = pt.name
  ORDER BY pa2.season DESC NULLS LAST
  LIMIT 1
) pa_latest ON pa_exact.player_id IS NULL

-- Coalesce pa_exact and pa_latest into pa_ev for convenience
CROSS JOIN LATERAL (
  SELECT
    COALESCE(pa_exact.ev_percent, pa_latest.ev_percent) AS ev_percent,
    COALESCE(pa_exact.l5, pa_latest.l5) AS l5,
    COALESCE(pa_exact.l10, pa_latest.l10) AS l10,
    COALESCE(pa_exact.l20, pa_latest.l20) AS l20,
    COALESCE(pa_exact.h2h_avg, pa_latest.h2h_avg) AS h2h_avg,
    COALESCE(pa_exact.season_avg, pa_latest.season_avg) AS season_avg,
    COALESCE(pa_exact.matchup_rank, pa_latest.matchup_rank) AS matchup_rank
) pa_ev;
