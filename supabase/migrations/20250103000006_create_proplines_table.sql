-- Create PropLines table for storing player prop odds data
CREATE TABLE IF NOT EXISTS public.PropLines (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128) NOT NULL,
  team VARCHAR(8) NOT NULL,
  opponent VARCHAR(8),
  season INTEGER NOT NULL,
  date DATE NOT NULL,
  prop_type VARCHAR(64) NOT NULL,
  line DECIMAL(10,2) NOT NULL,           -- Sportsbook line
  over_odds INTEGER,                     -- Over odds (e.g., -110, +150)
  under_odds INTEGER,                    -- Under odds (e.g., -110, +150)
  sportsbook VARCHAR(32) DEFAULT 'Consensus',
  league VARCHAR(8) NOT NULL,            -- nfl, nba, mlb, nhl
  game_id VARCHAR(64),                   -- Reference to game
  position VARCHAR(8),                   -- Player position
  is_active BOOLEAN DEFAULT true,        -- Whether the line is still active
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(player_id, date, prop_type, sportsbook, line),
  
  -- Indexes for performance
  INDEX idx_proplines_player_date (player_id, date),
  INDEX idx_proplines_league_date (league, date),
  INDEX idx_proplines_prop_type (prop_type),
  INDEX idx_proplines_active (is_active),
  INDEX idx_proplines_sportsbook (sportsbook),
  INDEX idx_proplines_last_updated (last_updated)
);

-- Enable RLS
ALTER TABLE public.PropLines ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for anonymous access (public data)
CREATE POLICY "Allow all access to PropLines" ON public.PropLines
FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.PropLines TO anon;
GRANT ALL ON public.PropLines TO authenticated;
GRANT USAGE ON SEQUENCE proplines_id_seq TO anon;
GRANT USAGE ON SEQUENCE proplines_id_seq TO authenticated;

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_proplines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_proplines_last_updated
BEFORE UPDATE ON public.PropLines
FOR EACH ROW
EXECUTE FUNCTION update_proplines_updated_at();

-- Function to clean up old prop lines (optional)
CREATE OR REPLACE FUNCTION cleanup_old_proplines()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete prop lines older than 30 days and inactive
  DELETE FROM public.PropLines 
  WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_proplines() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_proplines() TO anon;
