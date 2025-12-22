-- 0014: Icura NHL Backbone (Phase 1)
-- Adds canonical tables needed for Icura ingestion + modeling:
-- Goalies, Events (shots/goals/penalties), xG model outputs, goalie metrics, line combos.

-- Ensure extensions are present (safe no-ops if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Goalies
-- =========================
CREATE TABLE IF NOT EXISTS public.goalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  catches TEXT,                 -- 'L' or 'R' (catching hand)
  shoots TEXT,                  -- 'L' or 'R' (for skaters/goalies sometimes tracked)
  is_starter BOOLEAN DEFAULT false,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_goalies_player UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS idx_goalies_league ON public.goalies(league_id);
CREATE INDEX IF NOT EXISTS idx_goalies_team ON public.goalies(team_id);

-- =========================
-- xG Models
-- =========================
CREATE TABLE IF NOT EXISTS public.xg_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,            -- e.g. 'public_xg', 'icura_xg'
  version TEXT NOT NULL,         -- semantic/version string
  description TEXT,
  feature_spec JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_xg_models UNIQUE(league_id, name, version)
);

-- =========================
-- Game Events (shots/goals/penalties, by time)
-- =========================
CREATE TABLE IF NOT EXISTS public.game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  opponent_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  goalie_id UUID REFERENCES public.goalies(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,       -- 'shot', 'goal', 'penalty', 'faceoff', etc.
  period INT,                     -- 1,2,3,OT
  period_time_seconds INT,        -- seconds elapsed in period (0..1200)
  game_time_seconds INT,          -- seconds elapsed in game

  strength_state TEXT,            -- '5v5','PP','PK','4v4', etc.
  shot_type TEXT,                 -- wrist, slap, backhand, tip, etc.
  x_coord NUMERIC,
  y_coord NUMERIC,
  is_goal BOOLEAN,

  penalty_type TEXT,
  penalty_minutes INT,

  description TEXT,
  source TEXT DEFAULT 'official',
  external_id TEXT,               -- de-dup from provider (if any)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_events_game_time ON public.game_events(game_id, game_time_seconds);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON public.game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_team ON public.game_events(team_id);

-- =========================
-- xG values per event per model (supports multiple xG models)
-- =========================
CREATE TABLE IF NOT EXISTS public.xg_event_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.game_events(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.xg_models(id) ON DELETE CASCADE,
  xg NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_xg_event_model UNIQUE(event_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_xg_event_values_model ON public.xg_event_values(model_id);

-- =========================
-- Goalie per-game metrics (shot-stopping + shot-profile)
-- =========================
CREATE TABLE IF NOT EXISTS public.goalie_game_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  goalie_id UUID NOT NULL REFERENCES public.goalies(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  opponent_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,

  shots INT,
  saves INT,
  goals_against INT,
  save_pct NUMERIC,
  xg_against NUMERIC,
  gsax NUMERIC,                   -- goals saved above expected
  shot_profile JSONB DEFAULT '{}'::jsonb, -- e.g. buckets by location/type

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_goalie_game UNIQUE(goalie_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_goalie_game_metrics_game ON public.goalie_game_metrics(game_id);
CREATE INDEX IF NOT EXISTS idx_goalie_game_metrics_goalie ON public.goalie_game_metrics(goalie_id);

-- =========================
-- Line combos (forwards/defense + special teams units)
-- =========================
CREATE TABLE IF NOT EXISTS public.nhl_line_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,         -- 'F', 'D', 'PP', 'PK'
  unit_slot TEXT NOT NULL,         -- '1','2','3','4' or 'PP1','PP2'
  players JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of player UUIDs or objects
  toi_seconds INT,
  xg_for NUMERIC,
  xg_against NUMERIC,
  goals_for INT,
  goals_against INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_nhl_line_combo UNIQUE(game_id, team_id, unit_type, unit_slot)
);

CREATE INDEX IF NOT EXISTS idx_nhl_line_combos_game ON public.nhl_line_combos(game_id);
CREATE INDEX IF NOT EXISTS idx_nhl_line_combos_team ON public.nhl_line_combos(team_id);


