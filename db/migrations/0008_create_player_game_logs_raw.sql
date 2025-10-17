-- Create raw storage for ingested player game logs
CREATE TABLE IF NOT EXISTS public.player_game_logs_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league text NOT NULL,
  season text,
  game_external_id text NOT NULL,
  player_external_id text,
  team_abbrev text,
  opponent_abbrev text,
  payload jsonb NOT NULL,
  source text DEFAULT 'official',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  normalized boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_player_game_logs_raw ON public.player_game_logs_raw
  (league, game_external_id, COALESCE(player_external_id, ''), COALESCE(source, 'official'));

-- Also add a simpler unique constraint to support ON CONFLICT (league, game_external_id, source)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'player_game_logs_raw'
      AND c.conname = 'uq_pglr_league_game_source'
  ) THEN
    ALTER TABLE public.player_game_logs_raw
      ADD CONSTRAINT uq_pglr_league_game_source UNIQUE (league, game_external_id, source);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pglr_normalized ON public.player_game_logs_raw(normalized) WHERE normalized = false;
CREATE INDEX IF NOT EXISTS idx_pglr_league_game ON public.player_game_logs_raw(league, game_external_id);
