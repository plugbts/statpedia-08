-- Add Cloudflare R2 pointer columns to raw logs table
ALTER TABLE public.player_game_logs_raw
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS object_key text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS size bigint,
  ADD COLUMN IF NOT EXISTS checksum text;

CREATE INDEX IF NOT EXISTS idx_pglr_object_ref ON public.player_game_logs_raw(bucket, object_key) WHERE bucket IS NOT NULL AND object_key IS NOT NULL;
