-- 0012: Align player_game_logs table shape with application schema
-- Safe, idempotent alterations to ensure inserts from ingestion succeed.

DO $$
BEGIN
  IF to_regclass('public.player_game_logs') IS NULL THEN
    RAISE NOTICE 'player_game_logs does not exist; creating minimal table';
    CREATE TABLE public.player_game_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
      team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
      game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
      opponent_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
      prop_type TEXT NOT NULL,
      line NUMERIC,
      actual_value NUMERIC,
      hit BOOLEAN,
      game_date DATE,
      season TEXT,
      home_away TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END$$;

-- Add missing columns to match Drizzle schema if they don't exist
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS opponent_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS line NUMERIC;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS actual_value NUMERIC;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS hit BOOLEAN;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS game_date DATE;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS season TEXT;
ALTER TABLE public.player_game_logs ADD COLUMN IF NOT EXISTS home_away TEXT;

-- If legacy column opponent_team_id exists and opponent_id is null, backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='player_game_logs' AND column_name='opponent_team_id'
  ) THEN
    UPDATE public.player_game_logs
    SET opponent_id = COALESCE(opponent_id, opponent_team_id)
    WHERE opponent_id IS NULL;
  END IF;
END$$;

-- Ensure game_id is of type UUID referencing games(id)
DO $$
DECLARE
  _type text;
BEGIN
  SELECT data_type INTO _type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='player_game_logs' AND column_name='game_id';
  IF _type IS NOT NULL AND _type <> 'uuid' THEN
    RAISE NOTICE 'Altering player_game_logs.game_id to UUID may require manual migration';
  END IF;
END$$;

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_pgl_player_id ON public.player_game_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_pgl_game_id ON public.player_game_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_pgl_prop_type ON public.player_game_logs(prop_type);
CREATE INDEX IF NOT EXISTS idx_pgl_game_date ON public.player_game_logs(game_date);
