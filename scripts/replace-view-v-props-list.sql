DO $$
BEGIN
  -- Try to drop dependent views safely
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS public.v_props_list CASCADE';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop view v_props_list directly: %', SQLERRM;
  END;
END$$;

-- Replace view v_props_list with hardened version
-- Fixes syntax, team/opponent resolution, ESPN logos, and analytics fallbacks

CREATE OR REPLACE VIEW public.v_props_list AS
SELECT
  pp.id,
  COALESCE(p.full_name, p.name) AS full_name,
  
  -- Team abbreviation with priority resolution
  COALESCE(
    t.abbreviation,
    t_pgl.abbreviation,
    CASE
      WHEN g.home_team_id = p.team_id THEN th.abbreviation
      WHEN g.away_team_id = p.team_id THEN ta.abbreviation
      ELSE NULL
    END
  ) AS team,
  
  -- Opponent abbreviation with priority resolution
  COALESCE(
    opp.abbreviation,
    t_pgl_opp.abbreviation,
    CASE
      WHEN g.home_team_id = p.team_id THEN ta.abbreviation
      WHEN g.away_team_id = p.team_id THEN th.abbreviation
      ELSE NULL
    END
  ) AS opponent,
  
  -- ESPN logo URLs for NFL/NBA/MLB/NHL
  CASE WHEN LOWER(COALESCE(l.abbreviation, l.code)) IN ('nfl','nba','mlb','nhl') THEN
    format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', 
      LOWER(COALESCE(l.abbreviation, l.code)), 
      LOWER(COALESCE(
        t.abbreviation,
        t_pgl.abbreviation,
        CASE
          WHEN g.home_team_id = p.team_id THEN th.abbreviation
          WHEN g.away_team_id = p.team_id THEN ta.abbreviation
          ELSE NULL
        END
      ))
    )
  END AS team_logo,
  
  CASE WHEN LOWER(COALESCE(l.abbreviation, l.code)) IN ('nfl','nba','mlb','nhl') THEN
    format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', 
      LOWER(COALESCE(l.abbreviation, l.code)), 
      LOWER(COALESCE(
        opp.abbreviation,
        t_pgl_opp.abbreviation,
        CASE
          WHEN g.home_team_id = p.team_id THEN ta.abbreviation
          WHEN g.away_team_id = p.team_id THEN th.abbreviation
          ELSE NULL
        END
      ))
    )
  END AS opponent_logo,
  
  pt.name AS market,
  pp.line,
  COALESCE(pp.odds_american, CASE WHEN pp.odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(pp.odds, '+', '') AS INT) ELSE NULL END) AS odds_american,
  pp.over_odds_american,
  pp.under_odds_american,
  
  -- Analytics fields with fallbacks (player_enriched_stats first, then player_analytics)
  COALESCE(pes.ev_percent, pa_ev.ev_percent)::numeric(8,3) AS ev_percent,
  COALESCE(pes.l5, pa_ev.l5) AS l5,
  COALESCE(pes.l10, pa_ev.l10) AS l10,
  COALESCE(pes.l20, pa_ev.l20) AS l20,
  COALESCE(pes.h2h_avg, pa_ev.h2h_avg) AS h2h_avg,
  COALESCE(pes.season_avg, pa_ev.season_avg) AS season_avg,
  COALESCE(pes.matchup_rank, pa_ev.matchup_rank) AS matchup_rank,
  pes.rating AS rating,
  COALESCE(pes.current_streak, 0) AS current_streak,
  
  -- League and game date
  COALESCE(l.abbreviation, l.code)::text AS league,
  g.game_date

FROM public.player_props pp
JOIN public.players p ON p.id = pp.player_id
JOIN public.prop_types pt ON pt.id = pp.prop_type_id
JOIN public.games g ON g.id = pp.game_id
LEFT JOIN public.leagues l ON l.id = g.league_id

-- Player's direct team
LEFT JOIN public.teams t ON t.id = p.team_id

-- Home and away teams from games
LEFT JOIN public.teams th ON th.id = g.home_team_id
LEFT JOIN public.teams ta ON ta.id = g.away_team_id

-- Opponent from player_enriched_stats subquery (FIXED: removed stray colon)
LEFT JOIN (
  SELECT DISTINCT ON (pes2.player_id, pes2.game_id)
    pes2.player_id,
    pes2.game_id,
    t_opp.abbreviation
  FROM public.player_enriched_stats pes2
  LEFT JOIN public.teams t_opp ON t_opp.id = pes2.opponent_team_id
) opp
  ON opp.player_id = pp.player_id AND opp.game_id = pp.game_id

-- Team via player_game_logs
LEFT JOIN (
  SELECT DISTINCT ON (pgl.player_id, pgl.game_id)
    pgl.player_id,
    pgl.game_id,
    t_pgl_team.abbreviation
  FROM public.player_game_logs pgl
  LEFT JOIN public.teams t_pgl_team ON t_pgl_team.id = pgl.team_id
) t_pgl
  ON t_pgl.player_id = pp.player_id AND t_pgl.game_id = pp.game_id

-- Opponent via player_game_logs
LEFT JOIN (
  SELECT DISTINCT ON (pgl.player_id, pgl.game_id)
    pgl.player_id,
    pgl.game_id,
    t_pgl_opp.abbreviation
  FROM public.player_game_logs pgl
  LEFT JOIN public.teams t_pgl_opp ON t_pgl_opp.id = pgl.opponent_team_id
) t_pgl_opp
  ON t_pgl_opp.player_id = pp.player_id AND t_pgl_opp.game_id = pp.game_id

-- Player enriched stats
LEFT JOIN public.player_enriched_stats pes
  ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id

-- Player analytics with exact season match
LEFT JOIN public.player_analytics pa_exact
  ON pa_exact.player_id = pp.player_id
 AND pa_exact.prop_type = pt.name
 AND pa_exact.season = EXTRACT(YEAR FROM g.game_date)::text

-- Player analytics with latest season fallback (only if exact not found)
LEFT JOIN LATERAL (
  SELECT pa2.*
    FROM public.player_analytics pa2
   WHERE pa2.player_id = pp.player_id
     AND pa2.prop_type = pt.name
   ORDER BY pa2.season DESC NULLS LAST
   LIMIT 1
) pa_latest ON pa_exact.player_id IS NULL

-- Coalesce analytics columns from exact or latest
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

