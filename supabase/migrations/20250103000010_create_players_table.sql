-- Create players table for canonical player ID mapping
-- This table stores the master list of players with their canonical IDs

CREATE TABLE IF NOT EXISTS public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  team TEXT NOT NULL,
  league TEXT NOT NULL,
  position TEXT,
  sport TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_players_player_id ON public.players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_full_name ON public.players(full_name);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team);
CREATE INDEX IF NOT EXISTS idx_players_league ON public.players(league);
CREATE INDEX IF NOT EXISTS idx_players_sport ON public.players(sport);
CREATE INDEX IF NOT EXISTS idx_players_active ON public.players(is_active);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_league_team ON public.players(league, team);
CREATE INDEX IF NOT EXISTS idx_players_sport_league ON public.players(sport, league);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for read access
CREATE POLICY "Allow read access to players" 
ON public.players 
FOR SELECT 
USING (true);

-- Create RLS policy for authenticated write access
CREATE POLICY "Allow authenticated write access to players" 
ON public.players 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_players_timestamps
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION update_players_updated_at();

-- Grant permissions
GRANT ALL ON public.players TO authenticated;
GRANT SELECT ON public.players TO anon;

-- Insert sample players for testing
INSERT INTO public.players (player_id, full_name, first_name, last_name, team, league, position, sport, is_active) VALUES
-- NFL Players
('JOSH_ALLEN-QB-BUF', 'Josh Allen', 'Josh', 'Allen', 'BUF', 'NFL', 'QB', 'football', true),
('PATRICK_MAHOMES-QB-KC', 'Patrick Mahomes', 'Patrick', 'Mahomes', 'KC', 'NFL', 'QB', 'football', true),
('LAMAR_JACKSON-QB-BAL', 'Lamar Jackson', 'Lamar', 'Jackson', 'BAL', 'NFL', 'QB', 'football', true),
('AARON_RODGERS-QB-NYJ', 'Aaron Rodgers', 'Aaron', 'Rodgers', 'NYJ', 'NFL', 'QB', 'football', true),
('JAXON_SMITHNJIGBA-WR-SEA', 'Jaxon Smith-Njigba', 'Jaxon', 'Smith-Njigba', 'SEA', 'NFL', 'WR', 'football', true),
('STEFON_DIGGS-WR-BUF', 'Stefon Diggs', 'Stefon', 'Diggs', 'BUF', 'NFL', 'WR', 'football', true),
('TYREEK_HILL-WR-MIA', 'Tyreek Hill', 'Tyreek', 'Hill', 'MIA', 'NFL', 'WR', 'football', true),
('DAVANTE_ADAMS-WR-LV', 'Davante Adams', 'Davante', 'Adams', 'LV', 'NFL', 'WR', 'football', true),
('COOPER_KUPP-WR-LAR', 'Cooper Kupp', 'Cooper', 'Kupp', 'LAR', 'NFL', 'WR', 'football', true),
('AUSTIN_EKELER-RB-LAC', 'Austin Ekeler', 'Austin', 'Ekeler', 'LAC', 'NFL', 'RB', 'football', true),
('DERRICK_HENRY-RB-TEN', 'Derrick Henry', 'Derrick', 'Henry', 'TEN', 'NFL', 'RB', 'football', true),
('JONATHAN_TAYLOR-RB-IND', 'Jonathan Taylor', 'Jonathan', 'Taylor', 'IND', 'NFL', 'RB', 'football', true),
('CHRISTIAN_MCCAFFREY-RB-SF', 'Christian McCaffrey', 'Christian', 'McCaffrey', 'SF', 'NFL', 'RB', 'football', true),
('NICK_CHUBB-RB-CLE', 'Nick Chubb', 'Nick', 'Chubb', 'CLE', 'NFL', 'RB', 'football', true),
('SAQUON_BARKLEY-RB-NYG', 'Saquon Barkley', 'Saquon', 'Barkley', 'NYG', 'NFL', 'RB', 'football', true),
('TRAVIS_KELCE-TE-KC', 'Travis Kelce', 'Travis', 'Kelce', 'KC', 'NFL', 'TE', 'football', true),
('MARK_ANDREWS-TE-BAL', 'Mark Andrews', 'Mark', 'Andrews', 'BAL', 'NFL', 'TE', 'football', true),
('GEORGE_KITTLE-TE-SF', 'George Kittle', 'George', 'Kittle', 'SF', 'NFL', 'TE', 'football', true),
('DARREN_WALLER-TE-NYG', 'Darren Waller', 'Darren', 'Waller', 'NYG', 'NFL', 'TE', 'football', true),

-- NBA Players
('LEBRON_JAMES-SF-LAL', 'LeBron James', 'LeBron', 'James', 'LAL', 'NBA', 'SF', 'basketball', true),
('STEPHEN_CURRY-PG-GSW', 'Stephen Curry', 'Stephen', 'Curry', 'GSW', 'NBA', 'PG', 'basketball', true),
('KEVIN_DURANT-SF-PHX', 'Kevin Durant', 'Kevin', 'Durant', 'PHX', 'NBA', 'SF', 'basketball', true),
('GIANNIS_ANTETOKOUNMPO-PF-MIL', 'Giannis Antetokounmpo', 'Giannis', 'Antetokounmpo', 'MIL', 'NBA', 'PF', 'basketball', true),
('LUKA_DONCIC-PG-DAL', 'Luka Doncic', 'Luka', 'Doncic', 'DAL', 'NBA', 'PG', 'basketball', true),
('JAYSON_TATUM-SF-BOS', 'Jayson Tatum', 'Jayson', 'Tatum', 'BOS', 'NBA', 'SF', 'basketball', true),
('JIMMY_BUTLER-SF-MIA', 'Jimmy Butler', 'Jimmy', 'Butler', 'MIA', 'NBA', 'SF', 'basketball', true),
('JOEL_EMBIID-C-PHI', 'Joel Embiid', 'Joel', 'Embiid', 'PHI', 'NBA', 'C', 'basketball', true),
('NIKOLA_JOKIC-C-DEN', 'Nikola Jokic', 'Nikola', 'Jokic', 'DEN', 'NBA', 'C', 'basketball', true),
('DAMIAN_LILLARD-PG-MIL', 'Damian Lillard', 'Damian', 'Lillard', 'MIL', 'NBA', 'PG', 'basketball', true),

-- MLB Players
('MIKE_TROUT-OF-LAA', 'Mike Trout', 'Mike', 'Trout', 'LAA', 'MLB', 'OF', 'baseball', true),
('RONALD_ACUNA_JR-OF-ATL', 'Ronald Acuna Jr', 'Ronald', 'Acuna Jr', 'ATL', 'MLB', 'OF', 'baseball', true),
('AARON_JUDGE-OF-NYY', 'Aaron Judge', 'Aaron', 'Judge', 'NYY', 'MLB', 'OF', 'baseball', true),
('FREDDIE_FREEMAN-1B-LAD', 'Freddie Freeman', 'Freddie', 'Freeman', 'LAD', 'MLB', '1B', 'baseball', true),
('JOSE_ALTUVE-2B-HOU', 'Jose Altuve', 'Jose', 'Altuve', 'HOU', 'MLB', '2B', 'baseball', true),
('MOOKIE_BETTS-OF-LAD', 'Mookie Betts', 'Mookie', 'Betts', 'LAD', 'MLB', 'OF', 'baseball', true),
('JUAN_SOTO-OF-SD', 'Juan Soto', 'Juan', 'Soto', 'SD', 'MLB', 'OF', 'baseball', true),
('VLADIMIR_GUERRERO_JR-1B-TOR', 'Vladimir Guerrero Jr', 'Vladimir', 'Guerrero Jr', 'TOR', 'MLB', '1B', 'baseball', true),
('BO_BICHETTE-SS-TOR', 'Bo Bichette', 'Bo', 'Bichette', 'TOR', 'MLB', 'SS', 'baseball', true),
('FERNANDO_TATIS_JR-SS-SD', 'Fernando Tatis Jr', 'Fernando', 'Tatis Jr', 'SD', 'MLB', 'SS', 'baseball', true),

-- NHL Players
('CONNOR_MCDAVID-C-EDM', 'Connor McDavid', 'Connor', 'McDavid', 'EDM', 'NHL', 'C', 'hockey', true),
('LEON_DRAISAITL-C-EDM', 'Leon Draisaitl', 'Leon', 'Draisaitl', 'EDM', 'NHL', 'C', 'hockey', true),
('AUSTON_MATTHEWS-C-TOR', 'Auston Matthews', 'Auston', 'Matthews', 'TOR', 'NHL', 'C', 'hockey', true),
('MITCH_MARNER-RW-TOR', 'Mitch Marner', 'Mitch', 'Marner', 'TOR', 'NHL', 'RW', 'hockey', true),
('ARTEMI_PANARIN-LW-NYR', 'Artemi Panarin', 'Artemi', 'Panarin', 'NYR', 'NHL', 'LW', 'hockey', true),
('ALEXANDER_OVECHKIN-LW-WSH', 'Alexander Ovechkin', 'Alexander', 'Ovechkin', 'WSH', 'NHL', 'LW', 'hockey', true),
('SIDNEY_CROSBY-C-PIT', 'Sidney Crosby', 'Sidney', 'Crosby', 'PIT', 'NHL', 'C', 'hockey', true),
('EVGENI_MALKIN-C-PIT', 'Evgeni Malkin', 'Evgeni', 'Malkin', 'PIT', 'NHL', 'C', 'hockey', true),
('NIKITA_KUCHEROV-RW-TB', 'Nikita Kucherov', 'Nikita', 'Kucherov', 'TB', 'NHL', 'RW', 'hockey', true),
('STEVEN_STAMKOS-C-TB', 'Steven Stamkos', 'Steven', 'Stamkos', 'TB', 'NHL', 'C', 'hockey', true);

-- Add helpful comments
COMMENT ON TABLE public.players IS 'Master list of players with canonical IDs for mapping';
COMMENT ON COLUMN public.players.player_id IS 'Canonical player ID used throughout the system';
COMMENT ON COLUMN public.players.full_name IS 'Full player name for display and matching';
COMMENT ON COLUMN public.players.team IS 'Current team abbreviation';
COMMENT ON COLUMN public.players.league IS 'League abbreviation (NFL, NBA, MLB, NHL)';
COMMENT ON COLUMN public.players.sport IS 'Sport name (football, basketball, baseball, hockey)';
