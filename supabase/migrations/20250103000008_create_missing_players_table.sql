-- Create missing_players table for tracking unmapped players
-- This table stores players that couldn't be mapped to canonical IDs for manual review

CREATE TABLE IF NOT EXISTS public.missing_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  league TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  generated_id TEXT NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 1,
  sample_odd_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(player_name, team, league)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_missing_players_count ON public.missing_players(count DESC);
CREATE INDEX IF NOT EXISTS idx_missing_players_league ON public.missing_players(league);
CREATE INDEX IF NOT EXISTS idx_missing_players_last_seen ON public.missing_players(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_missing_players_normalized_name ON public.missing_players(normalized_name);

-- Enable RLS
ALTER TABLE public.missing_players ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated access only
CREATE POLICY "Allow authenticated access to missing_players" 
ON public.missing_players 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_missing_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen = NOW();
  NEW.count = OLD.count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates and count increment
CREATE TRIGGER update_missing_players_timestamps
BEFORE UPDATE ON public.missing_players
FOR EACH ROW
EXECUTE FUNCTION update_missing_players_updated_at();

-- Grant permissions
GRANT ALL ON public.missing_players TO authenticated;
GRANT USAGE ON SEQUENCE missing_players_id_seq TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.missing_players IS 'Tracks players that could not be mapped to canonical IDs for manual review';
COMMENT ON COLUMN public.missing_players.count IS 'Number of times this unmapped player has been encountered';
COMMENT ON COLUMN public.missing_players.normalized_name IS 'Normalized player name for consistent matching';
COMMENT ON COLUMN public.missing_players.generated_id IS 'Auto-generated ID for the unmapped player';
