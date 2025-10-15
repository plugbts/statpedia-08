-- Migration 0004: Enrichment materialized views and refresh function
-- Creates opponent allowance and matchup ranks across leagues/markets

-- 1) Opponent allowance MV: average allowed actual_value by opponent and market
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_opponent_allowance AS
SELECT 
  g.league_id,
  l.abbreviation AS league,
  pgl.opponent_team_id AS team_id,
  pgl.prop_type AS market,
  COUNT(*) AS games,
  AVG(pgl.actual_value)::numeric(8,2) AS avg_allowed,
  AVG((pgl.hit)::int)::numeric(5,2) AS hit_rate
FROM public.player_game_logs pgl
JOIN public.games g ON g.id = pgl.game_id
JOIN public.leagues l ON l.id = g.league_id
WHERE pgl.opponent_team_id IS NOT NULL
GROUP BY 1,2,3,4;

CREATE INDEX IF NOT EXISTS idx_mv_opp_allow_team_market ON public.mv_opponent_allowance(team_id, market);
CREATE INDEX IF NOT EXISTS idx_mv_opp_allow_league ON public.mv_opponent_allowance(league);

-- 2) Matchup ranks MV: rank opponents within league/market by allowed average
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_matchup_ranks AS
SELECT 
  league,
  market,
  team_id,
  games,
  avg_allowed,
  RANK() OVER (PARTITION BY league, market ORDER BY avg_allowed DESC) AS rank_worst_first
FROM public.mv_opponent_allowance;

CREATE INDEX IF NOT EXISTS idx_mv_matchup_ranks_lookup ON public.mv_matchup_ranks(league, market, team_id);

-- 3) Refresh function to keep MVs up to date
CREATE OR REPLACE FUNCTION public.refresh_enrichment_mvs()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_opponent_allowance;
  REFRESH MATERIALIZED VIEW public.mv_matchup_ranks;
  REFRESH MATERIALIZED VIEW public.mv_player_rolling;
END;
$$ LANGUAGE plpgsql;

-- 4) Optional: update player_enriched_stats.matchup_rank using MV when present
DO $$
BEGIN
  IF to_regclass('public.player_enriched_stats') IS NOT NULL THEN
    UPDATE public.player_enriched_stats pes
    SET matchup_rank = mm.rank_worst_first
    FROM public.games g
    JOIN public.leagues l ON l.id = g.league_id
    JOIN public.mv_matchup_ranks mm ON mm.league = l.abbreviation AND mm.market = pes.market AND mm.team_id = pes.opponent_team_id
    WHERE pes.game_id = g.id AND (pes.matchup_rank IS NULL OR pes.matchup_rank <> mm.rank_worst_first);
  END IF;
END$$;

-- 5) Rolling windows (L5/L10/L20) per player/market for recent games
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_player_rolling AS
WITH base AS (
  SELECT 
    pgl.player_id,
    pgl.prop_type AS market,
    pgl.game_date,
    pgl.actual_value,
    ROW_NUMBER() OVER (PARTITION BY pgl.player_id, pgl.prop_type ORDER BY pgl.game_date DESC) AS rn
  FROM public.player_game_logs pgl
)
SELECT 
  player_id,
  market,
  AVG(CASE WHEN rn <= 5 THEN actual_value END)::numeric(8,2) AS l5,
  AVG(CASE WHEN rn <= 10 THEN actual_value END)::numeric(8,2) AS l10,
  AVG(CASE WHEN rn <= 20 THEN actual_value END)::numeric(8,2) AS l20
FROM base
GROUP BY player_id, market;

CREATE INDEX IF NOT EXISTS idx_mv_player_rolling_lookup ON public.mv_player_rolling(player_id, market);

-- 6) Optional backfill of player_enriched_stats with rolling numbers when missing
DO $$
BEGIN
  IF to_regclass('public.player_enriched_stats') IS NOT NULL THEN
    UPDATE public.player_enriched_stats pes
    SET l5 = COALESCE(pes.l5, mr.l5),
        l10 = COALESCE(pes.l10, mr.l10),
        l20 = COALESCE(pes.l20, mr.l20)
    FROM public.mv_player_rolling mr
    WHERE mr.player_id = pes.player_id AND mr.market = pes.market
      AND (pes.l5 IS NULL OR pes.l10 IS NULL OR pes.l20 IS NULL);
  END IF;
END$$;
