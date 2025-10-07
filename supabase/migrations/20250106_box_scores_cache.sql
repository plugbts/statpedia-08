-- Create box scores cache table for storing scraped historical data
CREATE TABLE IF NOT EXISTS public.box_scores_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  opponent TEXT NOT NULL,
  game_date DATE NOT NULL,
  season INTEGER NOT NULL,
  league TEXT NOT NULL, -- 'nfl', 'nba', 'mlb', 'nhl'
  prop_type TEXT NOT NULL, -- 'passing_yards', 'rushing_yards', etc.
  stat_value DECIMAL(10,2) NOT NULL,
  game_id TEXT, -- Unique identifier for the game
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_box_scores_player_date ON public.box_scores_cache(player_id, game_date DESC);
CREATE INDEX IF NOT EXISTS idx_box_scores_player_season ON public.box_scores_cache(player_id, season DESC);
CREATE INDEX IF NOT EXISTS idx_box_scores_player_opponent ON public.box_scores_cache(player_id, opponent);
CREATE INDEX IF NOT EXISTS idx_box_scores_player_prop ON public.box_scores_cache(player_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_box_scores_league_season ON public.box_scores_cache(league, season);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_box_scores_unique ON public.box_scores_cache(player_id, game_date, prop_type);

-- Enable RLS
ALTER TABLE public.box_scores_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read box scores
CREATE POLICY "Allow read access to box scores" 
ON public.box_scores_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow service role to insert/update box scores (for scraping)
CREATE POLICY "Allow service role to manage box scores" 
ON public.box_scores_cache 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_box_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_box_scores_cache_updated_at
BEFORE UPDATE ON public.box_scores_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_box_scores_updated_at();

-- Create defensive rankings cache table
CREATE TABLE IF NOT EXISTS public.defensive_rankings_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team TEXT NOT NULL,
  league TEXT NOT NULL,
  season INTEGER NOT NULL,
  prop_type TEXT NOT NULL,
  position TEXT, -- QB, RB, WR, etc.
  rank INTEGER NOT NULL,
  stat_value DECIMAL(10,2), -- The actual defensive stat (e.g., yards allowed)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for defensive rankings
CREATE INDEX IF NOT EXISTS idx_defensive_rankings_team_season ON public.defensive_rankings_cache(team, season DESC);
CREATE INDEX IF NOT EXISTS idx_defensive_rankings_league_season ON public.defensive_rankings_cache(league, season DESC);
CREATE INDEX IF NOT EXISTS idx_defensive_rankings_prop_position ON public.defensive_rankings_cache(prop_type, position);

-- Create unique constraint for defensive rankings
CREATE UNIQUE INDEX IF NOT EXISTS idx_defensive_rankings_unique ON public.defensive_rankings_cache(team, league, season, prop_type, position);

-- Enable RLS for defensive rankings
ALTER TABLE public.defensive_rankings_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read defensive rankings
CREATE POLICY "Allow read access to defensive rankings" 
ON public.defensive_rankings_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow service role to manage defensive rankings
CREATE POLICY "Allow service role to manage defensive rankings" 
ON public.defensive_rankings_cache 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create trigger for defensive rankings timestamp updates
CREATE TRIGGER update_defensive_rankings_cache_updated_at
BEFORE UPDATE ON public.defensive_rankings_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_box_scores_updated_at();
