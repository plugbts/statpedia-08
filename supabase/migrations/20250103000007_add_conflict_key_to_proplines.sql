-- Add conflict_key field to proplines table for efficient upserts
-- This field will be used as a unique identifier for upsert operations

-- Add the conflict_key column
ALTER TABLE public.proplines 
ADD COLUMN IF NOT EXISTS conflict_key TEXT;

-- Create a unique index on conflict_key for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_proplines_conflict_key 
ON public.proplines(conflict_key) 
WHERE conflict_key IS NOT NULL;

-- Create a function to generate conflict_key from existing data
CREATE OR REPLACE FUNCTION generate_conflict_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate conflict_key in format: player_id-prop_type-line-sportsbook-date
  NEW.conflict_key = CONCAT(
    NEW.player_id, '-',
    NEW.prop_type, '-',
    NEW.line, '-',
    NEW.sportsbook, '-',
    NEW.date
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate conflict_key
CREATE TRIGGER generate_proplines_conflict_key
  BEFORE INSERT OR UPDATE ON public.proplines
  FOR EACH ROW
  EXECUTE FUNCTION generate_conflict_key();

-- Backfill existing records with conflict_key
UPDATE public.proplines 
SET conflict_key = CONCAT(
  player_id, '-',
  prop_type, '-',
  line, '-',
  sportsbook, '-',
  date
)
WHERE conflict_key IS NULL;

-- Add comment explaining the conflict_key field
COMMENT ON COLUMN public.proplines.conflict_key IS 'Unique identifier for upsert operations combining player_id, prop_type, line, sportsbook, and date';
