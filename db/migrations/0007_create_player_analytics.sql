-- 0007: Create player_analytics table for precomputed metrics

CREATE TABLE IF NOT EXISTS public.player_analytics (
  player_id uuid NOT NULL,
  prop_type text NOT NULL,
  season text NOT NULL,
  sport text,
  opponent_team_id uuid,
  l5 numeric,
  l10 numeric,
  l20 numeric,
  current_streak integer,
  h2h_avg numeric,
  season_avg numeric,
  matchup_rank integer,
  ev_percent numeric,
  last_updated timestamptz DEFAULT now(),
  PRIMARY KEY (player_id, prop_type, season)
);

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS idx_player_analytics_player_prop ON public.player_analytics (player_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_player_analytics_opponent_prop ON public.player_analytics (opponent_team_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_player_analytics_season ON public.player_analytics (season);
