-- 0015: Icura Early-Goal Dataset + Predictions (G1F5 / G1F10)
-- Phase: Early-game dataset + engine persistence

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add flexible attributes bucket to events so we can attach:
-- - rush chance flag, rebound flag, high-danger flag
-- - zone entry, turnover, faceoff outcome
-- - screened shot flags, shot speed (Edge), etc.
ALTER TABLE public.game_events
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- =========================
-- Closing market lines (for edge + evaluation)
-- =========================
CREATE TABLE IF NOT EXISTS public.icura_nhl_market_closing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  date_iso DATE,
  closing_total NUMERIC,
  closing_first_period_total NUMERIC,
  closing_moneyline_home INT,
  closing_moneyline_away INT,
  source TEXT DEFAULT 'market',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_icura_market_game UNIQUE(game_id)
);

-- =========================
-- Early-game dataset (one row per game)
-- Targets: goal_in_first_5 / goal_in_first_10
-- Features: home_* and away_* columns
-- =========================
CREATE TABLE IF NOT EXISTS public.icura_nhl_early_game_dataset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  season TEXT,

  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Targets (from event timeline)
  goal_in_first_5 BOOLEAN,
  goal_in_first_10 BOOLEAN,

  -- =====================
  -- Core Team Features (Offense) - FIRST 10, rolling last 20 games
  -- =====================
  home_team_xgf_first10_last20 NUMERIC,
  home_team_shots_first10_last20 NUMERIC,
  home_team_high_danger_first10_last20 NUMERIC,
  home_team_rush_chances_first10_last20 NUMERIC,
  home_team_avg_time_to_first_shot NUMERIC,
  home_team_avg_time_to_first_goal NUMERIC,

  away_team_xgf_first10_last20 NUMERIC,
  away_team_shots_first10_last20 NUMERIC,
  away_team_high_danger_first10_last20 NUMERIC,
  away_team_rush_chances_first10_last20 NUMERIC,
  away_team_avg_time_to_first_shot NUMERIC,
  away_team_avg_time_to_first_goal NUMERIC,

  -- =====================
  -- Core Team Features (Defense) - FIRST 10, rolling last 20 games
  -- =====================
  home_team_xga_first10_last20 NUMERIC,
  home_team_shots_allowed_first10_last20 NUMERIC,
  home_team_high_danger_allowed_first10_last20 NUMERIC,

  away_team_xga_first10_last20 NUMERIC,
  away_team_shots_allowed_first10_last20 NUMERIC,
  away_team_high_danger_allowed_first10_last20 NUMERIC,

  -- =====================
  -- Tempo Features (FIRST 10)
  -- =====================
  home_team_shot_attempts_first10 NUMERIC,
  home_team_faceoff_win_rate_first10 NUMERIC,
  home_team_zone_entry_rate_first10 NUMERIC,
  home_team_turnovers_first10 NUMERIC,

  away_team_shot_attempts_first10 NUMERIC,
  away_team_faceoff_win_rate_first10 NUMERIC,
  away_team_zone_entry_rate_first10 NUMERIC,
  away_team_turnovers_first10 NUMERIC,

  -- =====================
  -- Goalie Features (early weakness)
  -- Stored as numeric columns where possible; otherwise can be filled via JSON later.
  -- =====================
  home_goalie_id UUID REFERENCES public.goalies(id) ON DELETE SET NULL,
  away_goalie_id UUID REFERENCES public.goalies(id) ON DELETE SET NULL,

  home_goalie_gsax_first_period NUMERIC,
  home_goalie_save_pct_first10 NUMERIC,
  home_goalie_rebound_rate_first10 NUMERIC,
  home_goalie_rush_save_pct NUMERIC,
  home_goalie_screened_shot_save_pct NUMERIC,

  away_goalie_gsax_first_period NUMERIC,
  away_goalie_save_pct_first10 NUMERIC,
  away_goalie_rebound_rate_first10 NUMERIC,
  away_goalie_rush_save_pct NUMERIC,
  away_goalie_screened_shot_save_pct NUMERIC,

  -- =====================
  -- Context Features
  -- =====================
  home_rest_days INT,
  away_rest_days INT,
  home_back_to_back BOOLEAN,
  away_back_to_back BOOLEAN,
  travel_distance NUMERIC,
  injury_impact_home NUMERIC,
  injury_impact_away NUMERIC,
  ref_penalty_rate NUMERIC,

  -- Market Features (closing)
  closing_total NUMERIC,
  closing_first_period_total NUMERIC,
  closing_moneyline_home INT,
  closing_moneyline_away INT,

  -- Extensible features bucket for future (Edge tracking, MoneyPuck priors, etc.)
  extras JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_icura_early_dataset_game UNIQUE(game_id)
);

CREATE INDEX IF NOT EXISTS idx_icura_early_dataset_date ON public.icura_nhl_early_game_dataset(date_iso);

-- =========================
-- Early-goal predictions (deploy outputs)
-- =========================
CREATE TABLE IF NOT EXISTS public.icura_nhl_early_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  icura_version TEXT NOT NULL,

  p_g1f5 NUMERIC NOT NULL,
  p_g1f10 NUMERIC NOT NULL,

  fair_odds_g1f5 NUMERIC,
  fair_odds_g1f10 NUMERIC,

  edge_g1f5 NUMERIC,
  edge_g1f10 NUMERIC,

  model_poisson_p10 NUMERIC,
  model_ml_p10 NUMERIC,
  blend_weight_poisson NUMERIC DEFAULT 0.6,
  blend_weight_ml NUMERIC DEFAULT 0.4,

  reasons JSONB DEFAULT '[]'::jsonb,
  debug JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_icura_early_pred_game_ver UNIQUE(game_id, icura_version)
);

CREATE INDEX IF NOT EXISTS idx_icura_early_pred_date ON public.icura_nhl_early_predictions(date_iso);


