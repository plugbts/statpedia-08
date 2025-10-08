-- Create proplines table for normalized player props data
-- This table stores all player props from various sportsbooks with canonical normalization

CREATE TABLE IF NOT EXISTS public.proplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  prop_type TEXT NOT NULL,
  line DECIMAL(10,2) NOT NULL,
  over_odds INTEGER NOT NULL,
  under_odds INTEGER NOT NULL,
  sportsbook TEXT NOT NULL,
  sportsbook_key TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_time TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  season TEXT NOT NULL,
  week TEXT,
  conflict_key TEXT UNIQUE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_proplines_player_id ON public.proplines(player_id);
CREATE INDEX IF NOT EXISTS idx_proplines_prop_type ON public.proplines(prop_type);
CREATE INDEX IF NOT EXISTS idx_proplines_league ON public.proplines(league);
CREATE INDEX IF NOT EXISTS idx_proplines_sportsbook ON public.proplines(sportsbook);
CREATE INDEX IF NOT EXISTS idx_proplines_game_id ON public.proplines(game_id);
CREATE INDEX IF NOT EXISTS idx_proplines_season ON public.proplines(season);
CREATE INDEX IF NOT EXISTS idx_proplines_week ON public.proplines(week);
CREATE INDEX IF NOT EXISTS idx_proplines_available ON public.proplines(is_available);
CREATE INDEX IF NOT EXISTS idx_proplines_last_updated ON public.proplines(last_updated);
CREATE INDEX IF NOT EXISTS idx_proplines_conflict_key ON public.proplines(conflict_key);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_proplines_league_season ON public.proplines(league, season);
CREATE INDEX IF NOT EXISTS idx_proplines_player_prop ON public.proplines(player_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_proplines_game_time ON public.proplines(game_time, league);

-- Enable Row Level Security (RLS)
ALTER TABLE public.proplines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow all users to read proplines data
CREATE POLICY "Allow read access to proplines" 
ON public.proplines 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert proplines data
CREATE POLICY "Allow insert access to proplines" 
ON public.proplines 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update proplines data
CREATE POLICY "Allow update access to proplines" 
ON public.proplines 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create debug tables for monitoring and analysis
CREATE TABLE IF NOT EXISTS public.debug_unmapped_markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_name TEXT NOT NULL,
  stat_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('marketName', 'statID')),
  league TEXT NOT NULL,
  sport TEXT NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  count INTEGER DEFAULT 1,
  sample_odd_id TEXT,
  sample_player_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(market_name, stat_id, source, league)
);

CREATE TABLE IF NOT EXISTS public.debug_coverage_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL,
  missing_prop_types TEXT[] DEFAULT '{}',
  expected_prop_types TEXT[] DEFAULT '{}',
  coverage_percentage DECIMAL(5,2) DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debug_ingestion_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_processed INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  unmapped_markets INTEGER DEFAULT 0,
  unmapped_stat_ids INTEGER DEFAULT 0,
  leagues JSONB DEFAULT '{}',
  sportsbooks JSONB DEFAULT '{}',
  prop_types JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on debug tables
ALTER TABLE public.debug_unmapped_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_coverage_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_ingestion_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for debug tables (admin only)
CREATE POLICY "Admin only access to debug tables" 
ON public.debug_unmapped_markets 
FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin only access to debug_coverage_gaps" 
ON public.debug_coverage_gaps 
FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin only access to debug_ingestion_stats" 
ON public.debug_ingestion_stats 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_proplines_updated_at BEFORE UPDATE ON public.proplines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debug_unmapped_markets_updated_at BEFORE UPDATE ON public.debug_unmapped_markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debug_coverage_gaps_updated_at BEFORE UPDATE ON public.debug_coverage_gaps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy querying of active props
CREATE OR REPLACE VIEW public.active_proplines AS
SELECT 
  id,
  player_id,
  player_name,
  team,
  opponent,
  prop_type,
  line,
  over_odds,
  under_odds,
  sportsbook,
  sportsbook_key,
  game_id,
  game_time,
  home_team,
  away_team,
  league,
  season,
  week,
  last_updated,
  created_at,
  updated_at
FROM public.proplines
WHERE is_available = true
  AND game_time > now() - interval '24 hours'
ORDER BY league, season, week, game_time, player_name, prop_type;

-- Grant permissions
GRANT SELECT ON public.active_proplines TO anon, authenticated;
GRANT ALL ON public.proplines TO authenticated;
GRANT ALL ON public.debug_unmapped_markets TO authenticated;
GRANT ALL ON public.debug_coverage_gaps TO authenticated;
GRANT ALL ON public.debug_ingestion_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.proplines IS 'Normalized player props data from various sportsbooks';
COMMENT ON COLUMN public.proplines.conflict_key IS 'Unique key combining player_id, prop_type, line, sportsbook, and game_id to prevent duplicates';
COMMENT ON COLUMN public.proplines.line IS 'The line/over-under value for the prop';
COMMENT ON COLUMN public.proplines.over_odds IS 'American odds for the over bet';
COMMENT ON COLUMN public.proplines.under_odds IS 'American odds for the under bet';
COMMENT ON COLUMN public.proplines.sportsbook IS 'Human-readable sportsbook name';
COMMENT ON COLUMN public.proplines.sportsbook_key IS 'Internal sportsbook identifier';

COMMENT ON TABLE public.debug_unmapped_markets IS 'Tracks markets that could not be normalized for debugging';
COMMENT ON TABLE public.debug_coverage_gaps IS 'Tracks missing prop types by league for coverage analysis';
COMMENT ON TABLE public.debug_ingestion_stats IS 'Historical ingestion performance metrics';
