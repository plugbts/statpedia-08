-- Player Logs Ingestion Schema Migration
-- Adds required columns and indexes for NBA/WNBA player logs ingestion

-- Step 1: Ensure players table has external_id column
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Step 2: Ensure games table has api_game_id column  
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS api_game_id TEXT UNIQUE;

-- Step 3: Create team_abbrev_map table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.team_abbrev_map (
  league TEXT NOT NULL,
  api_abbrev TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (league, api_abbrev)
);

-- Step 4: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_external_id ON public.players (external_id);
CREATE INDEX IF NOT EXISTS idx_games_api_game_id ON public.games (api_game_id);
CREATE INDEX IF NOT EXISTS idx_team_abbrev_map_lookup ON public.team_abbrev_map (league, api_abbrev);

-- Step 5: Add uniqueness constraint to player_game_logs for safe upserts
-- This prevents duplicate entries for the same player/game combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_game_logs_unique 
ON public.player_game_logs (player_id, game_id, prop_type)
WHERE prop_type IS NOT NULL;

-- Step 6: Insert WNBA team abbreviation mappings (including alternates)
INSERT INTO public.team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('WNBA','PHO',(SELECT id FROM public.teams WHERE name='Phoenix Mercury')),
  ('WNBA','PHX',(SELECT id FROM public.teams WHERE name='Phoenix Mercury')),
  ('WNBA','LAS',(SELECT id FROM public.teams WHERE name='Los Angeles Sparks')),
  ('WNBA','LA',(SELECT id FROM public.teams WHERE name='Los Angeles Sparks')),
  ('WNBA','CON',(SELECT id FROM public.teams WHERE name='Connecticut Sun')),
  ('WNBA','CT',(SELECT id FROM public.teams WHERE name='Connecticut Sun')),
  ('WNBA','NYL',(SELECT id FROM public.teams WHERE name='New York Liberty')),
  ('WNBA','NY',(SELECT id FROM public.teams WHERE name='New York Liberty')),
  ('WNBA','LVA',(SELECT id FROM public.teams WHERE name='Las Vegas Aces')),
  ('WNBA','LV',(SELECT id FROM public.teams WHERE name='Las Vegas Aces')),
  ('WNBA','ATL',(SELECT id FROM public.teams WHERE name='Atlanta Dream')),
  ('WNBA','CHI',(SELECT id FROM public.teams WHERE name='Chicago Sky')),
  ('WNBA','DAL',(SELECT id FROM public.teams WHERE name='Dallas Wings')),
  ('WNBA','IND',(SELECT id FROM public.teams WHERE name='Indiana Fever')),
  ('WNBA','WAS',(SELECT id FROM public.teams WHERE name='Washington Mystics')),
  ('WNBA','MIN',(SELECT id FROM public.teams WHERE name='Minnesota Lynx')),
  ('WNBA','SEA',(SELECT id FROM public.teams WHERE name='Seattle Storm')),
  ('WNBA','GSV',(SELECT id FROM public.teams WHERE name='Golden State Valkyries'))
ON CONFLICT (league, api_abbrev) DO NOTHING;

-- Step 7: Insert NBA team abbreviation mappings (including alternates)
INSERT INTO public.team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('NBA','ATL',(SELECT id FROM public.teams WHERE name='Atlanta Hawks')),
  ('NBA','BOS',(SELECT id FROM public.teams WHERE name='Boston Celtics')),
  ('NBA','BKN',(SELECT id FROM public.teams WHERE name='Brooklyn Nets')),
  ('NBA','CHA',(SELECT id FROM public.teams WHERE name='Charlotte Hornets')),
  ('NBA','CHI',(SELECT id FROM public.teams WHERE name='Chicago Bulls')),
  ('NBA','CLE',(SELECT id FROM public.teams WHERE name='Cleveland Cavaliers')),
  ('NBA','DAL',(SELECT id FROM public.teams WHERE name='Dallas Mavericks')),
  ('NBA','DEN',(SELECT id FROM public.teams WHERE name='Denver Nuggets')),
  ('NBA','DET',(SELECT id FROM public.teams WHERE name='Detroit Pistons')),
  ('NBA','GSW',(SELECT id FROM public.teams WHERE name='Golden State Warriors')),
  ('NBA','GS',(SELECT id FROM public.teams WHERE name='Golden State Warriors')),
  ('NBA','HOU',(SELECT id FROM public.teams WHERE name='Houston Rockets')),
  ('NBA','IND',(SELECT id FROM public.teams WHERE name='Indiana Pacers')),
  ('NBA','LAC',(SELECT id FROM public.teams WHERE name='LA Clippers')),
  ('NBA','LAL',(SELECT id FROM public.teams WHERE name='Los Angeles Lakers')),
  ('NBA','MEM',(SELECT id FROM public.teams WHERE name='Memphis Grizzlies')),
  ('NBA','MIA',(SELECT id FROM public.teams WHERE name='Miami Heat')),
  ('NBA','MIL',(SELECT id FROM public.teams WHERE name='Milwaukee Bucks')),
  ('NBA','MIN',(SELECT id FROM public.teams WHERE name='Minnesota Timberwolves')),
  ('NBA','NOP',(SELECT id FROM public.teams WHERE name='New Orleans Pelicans')),
  ('NBA','NO',(SELECT id FROM public.teams WHERE name='New Orleans Pelicans')),
  ('NBA','NYK',(SELECT id FROM public.teams WHERE name='New York Knicks')),
  ('NBA','NY',(SELECT id FROM public.teams WHERE name='New York Knicks')),
  ('NBA','OKC',(SELECT id FROM public.teams WHERE name='Oklahoma City Thunder')),
  ('NBA','ORL',(SELECT id FROM public.teams WHERE name='Orlando Magic')),
  ('NBA','PHI',(SELECT id FROM public.teams WHERE name='Philadelphia 76ers')),
  ('NBA','PHX',(SELECT id FROM public.teams WHERE name='Phoenix Suns')),
  ('NBA','POR',(SELECT id FROM public.teams WHERE name='Portland Trail Blazers')),
  ('NBA','SAC',(SELECT id FROM public.teams WHERE name='Sacramento Kings')),
  ('NBA','SAS',(SELECT id FROM public.teams WHERE name='San Antonio Spurs')),
  ('NBA','SA',(SELECT id FROM public.teams WHERE name='San Antonio Spurs')),
  ('NBA','TOR',(SELECT id FROM public.teams WHERE name='Toronto Raptors')),
  ('NBA','UTA',(SELECT id FROM public.teams WHERE name='Utah Jazz')),
  ('NBA','WAS',(SELECT id FROM public.teams WHERE name='Washington Wizards'))
ON CONFLICT (league, api_abbrev) DO NOTHING;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.players.external_id IS 'External API identifier (NBA/WNBA numeric ID)';
COMMENT ON COLUMN public.games.api_game_id IS 'External API game identifier';
COMMENT ON TABLE public.team_abbrev_map IS 'Maps API team abbreviations to internal team IDs';

-- Step 9: Verify schema alignment
SELECT 
    'players' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' AND table_schema = 'public'
    AND column_name IN ('external_id', 'name', 'team_id')
ORDER BY column_name;

SELECT 
    'games' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'games' AND table_schema = 'public'
    AND column_name IN ('api_game_id', 'id', 'league_id')
ORDER BY column_name;

SELECT 
    'team_abbrev_map' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_abbrev_map' AND table_schema = 'public'
ORDER BY column_name;

-- Step 10: Validate mappings
SELECT 
    league,
    COUNT(*) as mappings_count,
    COUNT(DISTINCT team_id) as unique_teams
FROM public.team_abbrev_map 
GROUP BY league 
ORDER BY league;
