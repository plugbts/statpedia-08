-- 0016: MoneyPuck shot feed + Early-goal markets (G1F5 / G1F10)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- MoneyPuck shot rows (raw-enriched)
-- We store just what we need for matching:
-- - game id (NHL gamecenter id as text)
-- - time/period
-- - coordinates
-- - xG
-- - rush/high-danger/rebound flags
CREATE TABLE IF NOT EXISTS public.moneypuck_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league TEXT NOT NULL DEFAULT 'NHL',
  season TEXT,
  game_external_id TEXT NOT NULL,        -- NHL game id (string)
  team_abbr TEXT,
  opponent_abbr TEXT,
  period INT,
  period_time_seconds INT,
  game_time_seconds INT,
  shooter_name TEXT,
  goalie_name TEXT,
  shot_type TEXT,
  x_coord NUMERIC,
  y_coord NUMERIC,
  xg NUMERIC,
  is_goal BOOLEAN,
  is_rush BOOLEAN,
  is_rebound BOOLEAN,
  is_high_danger BOOLEAN,
  shot_speed NUMERIC,
  strength_state TEXT,
  source TEXT DEFAULT 'moneypuck',
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_moneypuck_shot UNIQUE(game_external_id, period, period_time_seconds, team_abbr, shooter_name, x_coord, y_coord)
);

CREATE INDEX IF NOT EXISTS idx_moneypuck_shots_game ON public.moneypuck_shots(game_external_id);
CREATE INDEX IF NOT EXISTS idx_moneypuck_shots_time ON public.moneypuck_shots(game_external_id, game_time_seconds);

-- Early-goal market odds (YES/NO) for first 5 / first 10
CREATE TABLE IF NOT EXISTS public.icura_nhl_market_early_goal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  date_iso DATE,
  market_g1f5_yes_odds INT,
  market_g1f5_no_odds INT,
  market_g1f10_yes_odds INT,
  market_g1f10_no_odds INT,
  source TEXT DEFAULT 'sportsgameodds',
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_icura_market_early_goal UNIQUE(game_id)
);


