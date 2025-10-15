-- Migration 0003: Identity mapping (teams/players), backfills, and normalization
-- Safe, idempotent patterns with IF NOT EXISTS and guards

-- 0) Helpers: ensure uuid extension (if not already from 0001)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Team abbreviation mapping table (unified)
CREATE TABLE IF NOT EXISTS public.team_abbrev_map (
  league TEXT NOT NULL,
  api_abbrev TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (league, api_abbrev)
);
CREATE INDEX IF NOT EXISTS idx_team_abbrev_map_lookup ON public.team_abbrev_map (league, api_abbrev);

-- 2) Add team_id/opponent_team_id on player_props if missing, with backfill
ALTER TABLE public.player_props ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.player_props ADD COLUMN IF NOT EXISTS opponent_team_id UUID REFERENCES public.teams(id);
CREATE INDEX IF NOT EXISTS idx_player_props_team_id ON public.player_props(team_id);
CREATE INDEX IF NOT EXISTS idx_player_props_opponent_team_id ON public.player_props(opponent_team_id);

-- Backfill using players.team_id and games home/away relationship
DO $$
BEGIN
  IF to_regclass('public.player_props') IS NOT NULL
     AND to_regclass('public.players') IS NOT NULL
     AND to_regclass('public.games') IS NOT NULL THEN
    -- team_id from players
    UPDATE public.player_props pp
    SET team_id = p.team_id
    FROM public.players p
    WHERE p.id = pp.player_id AND (pp.team_id IS NULL OR pp.team_id <> p.team_id);

    -- opponent from games
    UPDATE public.player_props pp
    SET opponent_team_id = CASE WHEN g.home_team_id = p.team_id THEN g.away_team_id
                                WHEN g.away_team_id = p.team_id THEN g.home_team_id
                                ELSE opponent_team_id END
    FROM public.players p
    JOIN public.games g ON g.id = pp.game_id
    WHERE p.id = pp.player_id
      AND (pp.opponent_team_id IS NULL OR pp.opponent_team_id NOT IN (g.home_team_id, g.away_team_id));
  END IF;
END$$;

-- 3) Players canonical + external id mappings
CREATE TABLE IF NOT EXISTS public.players_canonical (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  league TEXT, -- derived from team->league where available
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_external_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players_canonical(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_external_ids_unique UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_players_canonical_team_id ON public.players_canonical(team_id);
CREATE INDEX IF NOT EXISTS idx_players_canonical_league ON public.players_canonical(league);
CREATE INDEX IF NOT EXISTS idx_player_external_ids_player ON public.player_external_ids(player_id);

-- Backfill players_canonical from existing players when missing
DO $$
BEGIN
  IF to_regclass('public.players') IS NOT NULL THEN
    INSERT INTO public.players_canonical (id, display_name, team_id, league)
    SELECT p.id, p.full_name, p.team_id, lower(l.abbreviation)
    FROM public.players p
    LEFT JOIN public.teams t ON t.id = p.team_id
    LEFT JOIN public.leagues l ON l.id = t.league_id
    LEFT JOIN public.players_canonical pc ON pc.id = p.id
    WHERE pc.id IS NULL;

    -- Map known external ids from players table into mapping table when present
    INSERT INTO public.player_external_ids (player_id, provider, external_id)
    SELECT p.id, 'legacy', p.external_id
    FROM public.players p
    JOIN public.players_canonical pc ON pc.id = p.id
    WHERE p.external_id IS NOT NULL
    ON CONFLICT (provider, external_id) DO NOTHING;
  END IF;
END$$;

-- 4) prop_types normalization
ALTER TABLE public.prop_types ADD COLUMN IF NOT EXISTS canonical_name TEXT;
UPDATE public.prop_types SET canonical_name = lower(trim(name))
WHERE canonical_name IS NULL OR canonical_name <> lower(trim(name));
CREATE INDEX IF NOT EXISTS idx_prop_types_canonical_name ON public.prop_types(canonical_name);

-- 5) numeric odds on player_props
ALTER TABLE public.player_props ADD COLUMN IF NOT EXISTS odds_american INT;
ALTER TABLE public.player_props ADD COLUMN IF NOT EXISTS over_odds_american INT;
ALTER TABLE public.player_props ADD COLUMN IF NOT EXISTS under_odds_american INT;

UPDATE public.player_props
SET odds_american = CASE WHEN odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(odds, '+','') AS INT) ELSE odds_american END,
    over_odds_american = CASE WHEN over_odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(over_odds, '+','') AS INT) ELSE over_odds_american END,
    under_odds_american = CASE WHEN under_odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(under_odds, '+','') AS INT) ELSE under_odds_american END
WHERE TRUE;

-- 6) Expand v_props_list with league and game_date for UI filtering, and reflect numeric odds
DO $$
BEGIN
  IF to_regclass('public.player_props') IS NOT NULL
     AND to_regclass('public.players') IS NOT NULL
     AND to_regclass('public.games') IS NOT NULL
     AND to_regclass('public.prop_types') IS NOT NULL THEN
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
      COALESCE(pp.odds_american, CASE WHEN pp.odds ~ '^[+-]\\d+$' THEN CAST(REPLACE(pp.odds, '+', '') AS INT) ELSE NULL END) AS odds_american,
      pp.over_odds_american,
      pp.under_odds_american,
      pes.ev_percent,
      pes.streak_l5,
      pes.rating,
      pes.matchup_rank,
      pes.l5, pes.l10, pes.l20,
      pes.h2h_avg, pes.season_avg,
      l.abbreviation::text AS league,
      g.game_date
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
      ON pes.player_id = pp.player_id AND pes.game_id = pp.game_id;
  END IF;
END$$;

-- 7) Provide a normalized alias view for UI/components expecting that name
CREATE OR REPLACE VIEW public.player_props_normalized AS
SELECT * FROM public.v_props_list;
