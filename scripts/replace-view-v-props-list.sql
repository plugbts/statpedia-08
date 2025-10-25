DO $$
BEGIN
  -- Try to drop dependent views safely
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS public.v_props_list CASCADE';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop view v_props_list directly: %', SQLERRM;
  END;
END$$;

CREATE OR REPLACE VIEW public.v_props_list AS
SELECT
  pp.id,
  COALESCE(p.full_name, p.name) AS full_name,
  t.abbreviation AS team,
  COALESCE(opp.abbreviation,
    CASE WHEN g.home_team_id = p.team_id THEN opp2.abbreviation WHEN g.away_team_id = p.team_id THEN home2.abbreviation ELSE NULL END
  ) AS opponent,
  pt.name AS market,
  pp.line,
  COALESCE(pp.odds_american, CASE WHEN pp.odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(pp.odds, '+', '') AS INT) ELSE NULL END) AS odds_american,
  pp.over_odds_american,
  pp.under_odds_american,
  COALESCE(pes.ev_percent, pa.ev_percent)::numeric(8,3) AS ev_percent,
  pes.streak_l5,
  pes.rating,
  COALESCE(pes.matchup_rank, pa.matchup_rank) AS matchup_rank,
  COALESCE(pes.l5, pa.l5) AS l5,
  COALESCE(pes.l10, pa.l10) AS l10,
  COALESCE(pes.l20, pa.l20) AS l20,
  COALESCE(pes.h2h_avg, pa.h2h_avg) AS h2h_avg,
  COALESCE(pes.season_avg, pa.season_avg) AS season_avg,
  COALESCE(l.abbreviation, l.code)::text AS league,
  g.game_date,
  COALESCE(
    t.logo_url,
    CASE l.abbreviation
      WHEN 'NFL' THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || lower(t.abbreviation) || '.png'
      WHEN 'NBA' THEN 'https://a.espncdn.com/i/teamlogos/nba/500/' || lower(t.abbreviation) || '.png'
      WHEN 'MLB' THEN 'https://a.espncdn.com/i/teamlogos/mlb/500/' || lower(t.abbreviation) || '.png'
      WHEN 'NHL' THEN 'https://a.espncdn.com/i/teamlogos/nhl/500/' || lower(t.abbreviation) || '.png'
      ELSE NULL
    END
  ) AS team_logo,
  COALESCE(
    opp.logo_url,
    CASE l.abbreviation
      WHEN 'NFL' THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || lower(COALESCE(opp.abbreviation,
        CASE WHEN g.home_team_id = p.team_id THEN opp2.abbreviation WHEN g.away_team_id = p.team_id THEN home2.abbreviation ELSE NULL END)) || '.png'
      WHEN 'NBA' THEN 'https://a.espncdn.com/i/teamlogos/nba/500/' || lower(COALESCE(opp.abbreviation,
        CASE WHEN g.home_team_id = p.team_id THEN opp2.abbreviation WHEN g.away_team_id = p.team_id THEN home2.abbreviation ELSE NULL END)) || '.png'
      WHEN 'MLB' THEN 'https://a.espncdn.com/i/teamlogos/mlb/500/' || lower(COALESCE(opp.abbreviation,
        CASE WHEN g.home_team_id = p.team_id THEN opp2.abbreviation WHEN g.away_team_id = p.team_id THEN home2.abbreviation ELSE NULL END)) || '.png'
      WHEN 'NHL' THEN 'https://a.espncdn.com/i/teamlogos/nhl/500/' || lower(COALESCE(opp.abbreviation,
        CASE WHEN g.home_team_id = p.team_id THEN opp2.abbreviation WHEN g.away_team_id = p.team_id THEN home2.abbreviation ELSE NULL END)) || '.png'
      ELSE NULL
    END
  ) AS opponent_logo
FROM public.player_props pp
JOIN public.players p ON p.id = pp.player_id
JOIN public.prop_types pt ON pt.id = pp.prop_type_id
JOIN public.games g ON g.id = pp.game_id
JOIN public.leagues l ON l.id = g.league_id
LEFT JOIN public.teams t ON t.id = p.team_id
LEFT JOIN public.teams home2 ON home2.id = g.home_team_id
LEFT JOIN public.teams opp2 ON opp2.id = g.away_team_id
LEFT JOIN public.teams opp ON opp.id = (
  SELECT pes2.opponent_team_id FROM public.player_enriched_stats pes2
  WHERE pes2.player_id = pp.player_id AND pes2.game_id = pp.game_id LIMIT 1
)
LEFT JOIN public.player_enriched_stats pes
  ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id
-- Also join precomputed analytics by player/prop/season
LEFT JOIN public.player_analytics pa
  ON pa.player_id = pp.player_id
  AND pa.prop_type = pt.name
  AND pa.season = EXTRACT(YEAR FROM g.game_date)::text;
