-- 0017: Allow Icura pipelines to persist by external game id (NHL gamecenter id)
-- This avoids requiring games.id UUID mapping to exist before we can store markets/preds.

ALTER TABLE public.icura_nhl_market_closing
  ADD COLUMN IF NOT EXISTS game_external_id TEXT;

ALTER TABLE public.icura_nhl_market_early_goal
  ADD COLUMN IF NOT EXISTS game_external_id TEXT;

ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS game_external_id TEXT;

ALTER TABLE public.icura_nhl_early_predictions
  ADD COLUMN IF NOT EXISTS game_external_id TEXT;

-- Uniques for external id (idempotent-ish with checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_icura_market_closing_game_external'
  ) THEN
    ALTER TABLE public.icura_nhl_market_closing
      ADD CONSTRAINT uq_icura_market_closing_game_external UNIQUE (game_external_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_icura_market_early_goal_game_external'
  ) THEN
    ALTER TABLE public.icura_nhl_market_early_goal
      ADD CONSTRAINT uq_icura_market_early_goal_game_external UNIQUE (game_external_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_icura_early_dataset_game_external'
  ) THEN
    ALTER TABLE public.icura_nhl_early_game_dataset
      ADD CONSTRAINT uq_icura_early_dataset_game_external UNIQUE (game_external_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_icura_early_pred_game_external ON public.icura_nhl_early_predictions(game_external_id);


