-- Patch: Add missing player_game_logs table and fix teams.abbrev/abbreviation mismatch

-- 1. Add player_game_logs table (minimal, adjust as needed)
CREATE TABLE IF NOT EXISTS public.player_game_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.players(id),
  game_id UUID NOT NULL REFERENCES public.games(id),
  prop_type TEXT NOT NULL,
  actual_value NUMERIC(8,2),
  line NUMERIC(8,2),
  hit BOOLEAN,
  team_id UUID REFERENCES public.teams(id),
  opponent_team_id UUID REFERENCES public.teams(id),
  game_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pgl_player_id ON public.player_game_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_pgl_game_id ON public.player_game_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_pgl_prop_type ON public.player_game_logs(prop_type);

-- 2. Add abbrev column to teams if missing, and backfill from abbreviation
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS abbrev VARCHAR(10);
UPDATE public.teams SET abbrev = abbreviation WHERE abbrev IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_abbrev ON public.teams(abbrev);

-- 3. (Optional) Add NOT NULL constraint if you want strictness (commented out)
-- ALTER TABLE public.teams ALTER COLUMN abbrev SET NOT NULL;
