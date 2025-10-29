-- Replace view v_props_list with hardened version
-- Fixes syntax errors and adds proper fallbacks for team/opponent/analytics fields
-- Postgres 15 compatible

CREATE OR REPLACE VIEW public.v_props_list AS
SELECT
  pp.id,
  COALESCE(p.full_name, p.name) AS full_name,
  team_abbrev,
  opponent_abbrev,
  pt.name AS market,
  pp.line,
  COALESCE(pp.odds_american, CASE WHEN pp.odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(pp.odds, '+', '') AS INT) ELSE NULL END) AS odds_american,
  pp.over_odds_american,
  pp.under_odds_american,
  COALESCE(l.abbreviation, l.code)::text AS league,
  g.game_date,
  team_logo,
  opponent_logo,
  ev_percent,
  l5,
  l10,
  l20,
  h2h_avg,
  season_avg,
  matchup_rank,
  rating,
  current_streak
FROM public.player_props pp
JOIN public.players p ON p.id = pp.player_id
JOIN public.prop_types pt ON pt.id = pp.prop_type_id
JOIN public.games g ON g.id = pp.game_id
JOIN public.leagues l ON l.id = g.league_id
-- Direct team join by player.team_id
LEFT JOIN public.teams t ON t.id = p.team_id
-- Teams from game (home/away)
LEFT JOIN public.teams th ON th.id = g.home_team_id
LEFT JOIN public.teams ta ON ta.id = g.away_team_id
-- Opponent from player_enriched_stats subquery (derive abbreviation via opponent_team_id)
LEFT JOIN (
  SELECT
    pes_sub.player_id,
    pes_sub.game_id,
    t_opp.abbreviation
  FROM public.player_enriched_stats pes_sub
  LEFT JOIN public.teams t_opp ON t_opp.id = pes_sub.opponent_team_id
) opp
  ON opp.player_id = pp.player_id
 AND opp.game_id = pp.game_id
-- player_game_logs for team abbreviation fallback (player's team for that game)
LEFT JOIN (
  SELECT
    pgl_team.player_id,
    pgl_team.game_id,
    t_pgl_team.abbreviation
  FROM public.player_game_logs pgl_team
  LEFT JOIN public.teams t_pgl_team ON t_pgl_team.id = pgl_team.team_id
) t_pgl
  ON t_pgl.player_id = pp.player_id
 AND t_pgl.game_id = pp.game_id
-- player_game_logs for opponent abbreviation fallback
LEFT JOIN (
  SELECT
    pgl_opp.player_id,
    pgl_opp.game_id,
    t_pgl_opp_team.abbreviation
  FROM public.player_game_logs pgl_opp
  LEFT JOIN public.teams t_pgl_opp_team ON t_pgl_opp_team.id = pgl_opp.opponent_team_id
) t_pgl_opp
  ON t_pgl_opp.player_id = pp.player_id
 AND t_pgl_opp.game_id = pp.game_id
-- player_enriched_stats for analytics (primary source)
LEFT JOIN public.player_enriched_stats pes
  ON pes.player_id = pp.player_id
 AND pes.game_id = pp.game_id
-- player_analytics exact season match
LEFT JOIN public.player_analytics pa_exact
  ON pa_exact.player_id = pp.player_id
 AND pa_exact.prop_type = pt.name
 AND pa_exact.season = EXTRACT(YEAR FROM g.game_date)::text
-- player_analytics latest season fallback (only if no exact match)
LEFT JOIN LATERAL (
  SELECT pa2.*
  FROM public.player_analytics pa2
  WHERE pa2.player_id = pp.player_id
    AND pa2.prop_type = pt.name
  ORDER BY pa2.season DESC NULLS LAST
  LIMIT 1
) pa_latest ON pa_exact.player_id IS NULL
-- Coalesce player_analytics columns for convenience
CROSS JOIN LATERAL (
  SELECT
    COALESCE(pa_exact.ev_percent, pa_latest.ev_percent) AS pa_ev_percent,
    COALESCE(pa_exact.l5, pa_latest.l5) AS pa_l5,
    COALESCE(pa_exact.l10, pa_latest.l10) AS pa_l10,
    COALESCE(pa_exact.l20, pa_latest.l20) AS pa_l20,
    COALESCE(pa_exact.h2h_avg, pa_latest.h2h_avg) AS pa_h2h_avg,
    COALESCE(pa_exact.season_avg, pa_latest.season_avg) AS pa_season_avg,
    COALESCE(pa_exact.matchup_rank, pa_latest.matchup_rank) AS pa_matchup_rank,
    COALESCE(pa_exact.rating, pa_latest.rating) AS pa_rating
) pa_ev
-- Derive league_code, team_abbrev, opponent_abbrev once for reuse
CROSS JOIN LATERAL (
  SELECT
    LOWER(COALESCE(l.abbreviation, l.code)) AS league_code,
    COALESCE(
      t.abbreviation,
      t_pgl.abbreviation,
      CASE
        WHEN g.home_team_id = p.team_id THEN th.abbreviation
        WHEN g.away_team_id = p.team_id THEN ta.abbreviation
        ELSE NULL
      END
    ) AS team_abbrev,
    COALESCE(
      opp.abbreviation,
      t_pgl_opp.abbreviation,
      CASE
        WHEN g.home_team_id = p.team_id THEN ta.abbreviation
        WHEN g.away_team_id = p.team_id THEN th.abbreviation
        ELSE NULL
      END
    ) AS opponent_abbrev
) abbrevs
-- Derive logos using computed abbreviations
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN abbrevs.league_code IN ('nfl','nba','mlb','nhl') THEN
      format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', abbrevs.league_code, LOWER(abbrevs.team_abbrev))
    END AS team_logo,
    CASE WHEN abbrevs.league_code IN ('nfl','nba','mlb','nhl') THEN
      format('https://a.espncdn.com/i/teamlogos/%s/500/%s.png', abbrevs.league_code, LOWER(abbrevs.opponent_abbrev))
    END AS opponent_logo
) logos
-- Derive final analytics fields with fallbacks
CROSS JOIN LATERAL (
  SELECT
    COALESCE(pes.ev_percent, pa_ev.pa_ev_percent)::numeric(8,3) AS ev_percent,
    COALESCE(pes.l5, pa_ev.pa_l5) AS l5,
    COALESCE(pes.l10, pa_ev.pa_l10) AS l10,
    COALESCE(pes.l20, pa_ev.pa_l20) AS l20,
    COALESCE(pes.h2h_avg, pa_ev.pa_h2h_avg) AS h2h_avg,
    COALESCE(pes.season_avg, pa_ev.pa_season_avg) AS season_avg,
    COALESCE(pes.matchup_rank, pa_ev.pa_matchup_rank) AS matchup_rank,
    COALESCE(pes.rating, pa_ev.pa_rating) AS rating,
    COALESCE(pes.current_streak, 0) AS current_streak
) analytics;
