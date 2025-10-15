-- Migration 0002: Data health objects (enrichment table, views, debug function)
-- Safe to run multiple times; uses IF NOT EXISTS and guards

-- 1) Ensure enrichment table exists with required columns
CREATE TABLE IF NOT EXISTS public.player_enriched_stats (
  player_id UUID NOT NULL,
  game_id UUID NOT NULL,
  market TEXT,
  season INT,
  opponent_team_id UUID,
  ev_percent NUMERIC(8,3),
  streak_l5 INT,
  rating NUMERIC(5,2),
  matchup_rank INT,
  l5 NUMERIC(8,2),
  l10 NUMERIC(8,2),
  l20 NUMERIC(8,2),
  h2h_avg NUMERIC(8,2),
  season_avg NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_pes_player_game ON public.player_enriched_stats(player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_pes_market ON public.player_enriched_stats(market);

-- 2) Safer props listing view (uses existing core tables)
-- Falls back to deriving opponent from games.home/away when opponent_team_id missing
CREATE OR REPLACE VIEW public.v_props_list AS
SELECT
  pp.id,
  p.full_name,
  t.abbrev AS team,
  COALESCE(opp.abbrev,
    CASE WHEN g.home_team_id = p.team_id THEN opp2.abbrev WHEN g.away_team_id = p.team_id THEN home2.abbrev ELSE NULL END
  ) AS opponent,
  pt.name AS market,
  pp.line,
  CASE 
    WHEN pp.odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(pp.odds, '+', '') AS INT)
    ELSE NULL
  END AS odds_american,
  pes.ev_percent,
  pes.streak_l5,
  pes.rating,
  pes.matchup_rank,
  pes.l5, pes.l10, pes.l20,
  pes.h2h_avg, pes.season_avg
FROM public.player_props pp
JOIN public.players p ON p.id = pp.player_id
JOIN public.prop_types pt ON pt.id = pp.prop_type_id
JOIN public.games g ON g.id = pp.game_id
LEFT JOIN public.teams t ON t.id = p.team_id
LEFT JOIN public.teams home2 ON home2.id = g.home_team_id
LEFT JOIN public.teams opp2 ON opp2.id = g.away_team_id
LEFT JOIN public.teams opp ON opp.id = (
  SELECT pes2.opponent_team_id FROM public.player_enriched_stats pes2
  WHERE pes2.player_id = pp.player_id AND pes2.game_id = pp.game_id LIMIT 1
)
LEFT JOIN public.player_enriched_stats pes
  ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id;

-- 3) Real debug_pipeline that returns JSON with health metrics, guarding for missing tables
CREATE OR REPLACE FUNCTION public.debug_pipeline()
RETURNS JSON AS $$
DECLARE
  missing_players INT := 0;
  missing_player_teams INT := 0;
  missing_props_games INT := 0;
  missing_prop_team_id INT := 0;
  missing_prop_opponent_team_id INT := 0;
  missing_opponent_ids INT := 0;
  unenriched_count INT := 0;
  ev_null_or_zero INT := 0;
  streak_null INT := 0;
  rating_stuck_68 INT := 0;
  matchup_rank_null INT := 0;
  rolling_na INT := 0;
BEGIN
  -- player_props -> players
  IF to_regclass('public.player_props') IS NOT NULL AND to_regclass('public.players') IS NOT NULL THEN
    SELECT COUNT(*) INTO missing_players
    FROM public.player_props pp
    LEFT JOIN public.players p ON p.id = pp.player_id
    WHERE p.id IS NULL;
  END IF;

  -- players.team_id mapping
  IF to_regclass('public.players') IS NOT NULL THEN
    SELECT COUNT(*) INTO missing_player_teams FROM public.players WHERE team_id IS NULL;
  END IF;

  -- player_props -> games
  IF to_regclass('public.player_props') IS NOT NULL AND to_regclass('public.games') IS NOT NULL THEN
    SELECT COUNT(*) INTO missing_props_games
    FROM public.player_props pp
    LEFT JOIN public.games g ON g.id = pp.game_id
    WHERE g.id IS NULL;

    -- Null team/opponent on props
    SELECT COUNT(*) INTO missing_prop_team_id FROM public.player_props WHERE team_id IS NULL;
    SELECT COUNT(*) INTO missing_prop_opponent_team_id FROM public.player_props WHERE opponent_team_id IS NULL;
  END IF;

  -- opponent mapping in logs (optional presence)
  IF to_regclass('public.player_game_logs') IS NOT NULL THEN
    SELECT COUNT(*) INTO missing_opponent_ids FROM public.player_game_logs WHERE opponent_team_id IS NULL;
  END IF;

  -- enrichment nulls (optional presence)
  IF to_regclass('public.player_enriched_stats') IS NOT NULL THEN
    SELECT COUNT(*) INTO unenriched_count
    FROM public.player_props pp
    LEFT JOIN public.player_enriched_stats es
      ON es.player_id = pp.player_id AND es.game_id = pp.game_id
    WHERE es.player_id IS NULL;

    SELECT COUNT(*) INTO ev_null_or_zero FROM public.player_enriched_stats WHERE ev_percent IS NULL OR ev_percent = 0;
    SELECT COUNT(*) INTO streak_null FROM public.player_enriched_stats WHERE streak_l5 IS NULL;
    SELECT COUNT(*) INTO rating_stuck_68 FROM public.player_enriched_stats WHERE rating = 68;
    SELECT COUNT(*) INTO matchup_rank_null FROM public.player_enriched_stats WHERE matchup_rank IS NULL;
    SELECT COUNT(*) INTO rolling_na FROM public.player_enriched_stats
      WHERE l5 IS NULL OR l10 IS NULL OR l20 IS NULL;
  END IF;

  RETURN json_build_object(
    'missing_players', missing_players,
    'missing_player_teams', missing_player_teams,
    'missing_props_games', missing_props_games,
    'missing_prop_team_id', missing_prop_team_id,
    'missing_prop_opponent_team_id', missing_prop_opponent_team_id,
    'missing_opponent_ids', missing_opponent_ids,
    'unenriched_count', unenriched_count,
    'ev_null_or_zero', ev_null_or_zero,
    'streak_null', streak_null,
    'rating_stuck_68', rating_stuck_68,
    'matchup_rank_null', matchup_rank_null,
    'rolling_na', rolling_na
  );
END;
$$ LANGUAGE plpgsql;
