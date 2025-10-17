-- Manual application of missing players table migration
-- Run this directly in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.missing_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  league TEXT NOT NULL,
  generated_id TEXT NOT NULL,
  sample_odd_id TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_name, team, league, generated_id)
);

ALTER TABLE public.missing_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to missing_players" ON public.missing_players
FOR ALL USING (true);

-- GRANT ALL ON public.missing_players TO anon;
-- GRANT ALL ON public.missing_players TO authenticated;

-- Verify the table was created successfully
SELECT 'missing_players table created successfully' as status;
