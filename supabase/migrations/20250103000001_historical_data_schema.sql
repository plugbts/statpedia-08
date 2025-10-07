-- Historical Data Schema for PropFinder-style Analytics
-- This migration creates tables for storing historical player game logs and analytics

-- Create PlayerGameLogs table for storing historical box score data
CREATE TABLE IF NOT EXISTS public.player_game_logs (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128) NOT NULL,
  team VARCHAR(8) NOT NULL,
  opponent VARCHAR(8) NOT NULL,
  season INT NOT NULL,
  date DATE NOT NULL,
  prop_type VARCHAR(64) NOT NULL,
  value FLOAT NOT NULL,
  sport VARCHAR(8) NOT NULL DEFAULT 'NFL',
  position VARCHAR(8),
  game_id VARCHAR(64),
  home_away VARCHAR(4), -- 'HOME' or 'AWAY'
  weather_conditions VARCHAR(64),
  injury_status VARCHAR(32),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_player_season ON public.player_game_logs (player_id, season);
CREATE INDEX IF NOT EXISTS idx_player_opponent ON public.player_game_logs (player_id, opponent);
CREATE INDEX IF NOT EXISTS idx_player_date ON public.player_game_logs (player_id, date);
CREATE INDEX IF NOT EXISTS idx_player_prop_type ON public.player_game_logs (player_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_team_season ON public.player_game_logs (team, season);
CREATE INDEX IF NOT EXISTS idx_opponent_season ON public.player_game_logs (opponent, season);
CREATE INDEX IF NOT EXISTS idx_date_range ON public.player_game_logs (date);
CREATE INDEX IF NOT EXISTS idx_sport_season ON public.player_game_logs (sport, season);

-- Create Analytics table for precomputed hit rates and streaks
CREATE TABLE IF NOT EXISTS public.player_analytics (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128) NOT NULL,
  team VARCHAR(8) NOT NULL,
  prop_type VARCHAR(64) NOT NULL,
  sport VARCHAR(8) NOT NULL DEFAULT 'NFL',
  position VARCHAR(8),
  
  -- Hit rate analytics
  season_hit_rate_2025 FLOAT DEFAULT 0,
  season_games_2025 INT DEFAULT 0,
  h2h_hit_rate FLOAT DEFAULT 0,
  h2h_games INT DEFAULT 0,
  l5_hit_rate FLOAT DEFAULT 0,
  l5_games INT DEFAULT 0,
  l10_hit_rate FLOAT DEFAULT 0,
  l10_games INT DEFAULT 0,
  l20_hit_rate FLOAT DEFAULT 0,
  l20_games INT DEFAULT 0,
  
  -- Streak analytics
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  streak_direction VARCHAR(8), -- 'over' or 'under'
  
  -- Defensive rank analytics
  matchup_defensive_rank INT,
  matchup_rank_display VARCHAR(16) DEFAULT 'N/A',
  
  -- Chart data (JSON for flexibility)
  chart_data JSONB,
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(player_id, prop_type, sport)
);

-- Create indexes for analytics table
CREATE INDEX IF NOT EXISTS idx_analytics_player ON public.player_analytics (player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_team ON public.player_analytics (team);
CREATE INDEX IF NOT EXISTS idx_analytics_prop_type ON public.player_analytics (prop_type);
CREATE INDEX IF NOT EXISTS idx_analytics_sport ON public.player_analytics (sport);
CREATE INDEX IF NOT EXISTS idx_analytics_last_updated ON public.player_analytics (last_updated);

-- Create DefensiveStats table for team defensive rankings
CREATE TABLE IF NOT EXISTS public.defensive_stats (
  id SERIAL PRIMARY KEY,
  team VARCHAR(8) NOT NULL,
  opponent VARCHAR(8) NOT NULL,
  season INT NOT NULL,
  sport VARCHAR(8) NOT NULL DEFAULT 'NFL',
  prop_type VARCHAR(64) NOT NULL,
  position VARCHAR(8),
  rank INT NOT NULL,
  avg_allowed FLOAT NOT NULL,
  games_played INT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(team, opponent, season, sport, prop_type, position)
);

-- Create indexes for defensive stats
CREATE INDEX IF NOT EXISTS idx_defensive_team ON public.defensive_stats (team);
CREATE INDEX IF NOT EXISTS idx_defensive_opponent ON public.defensive_stats (opponent);
CREATE INDEX IF NOT EXISTS idx_defensive_prop_type ON public.defensive_stats (prop_type);
CREATE INDEX IF NOT EXISTS idx_defensive_position ON public.defensive_stats (position);
CREATE INDEX IF NOT EXISTS idx_defensive_season ON public.defensive_stats (season);

-- Enable RLS on all tables
ALTER TABLE public.player_game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defensive_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for player_game_logs
CREATE POLICY "Allow read access to player game logs" 
ON public.player_game_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to player game logs" 
ON public.player_game_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to player game logs" 
ON public.player_game_logs 
FOR UPDATE 
USING (true);

-- Create RLS policies for player_analytics
CREATE POLICY "Allow read access to player analytics" 
ON public.player_analytics 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to player analytics" 
ON public.player_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to player analytics" 
ON public.player_analytics 
FOR UPDATE 
USING (true);

-- Create RLS policies for defensive_stats
CREATE POLICY "Allow read access to defensive stats" 
ON public.defensive_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert access to defensive stats" 
ON public.defensive_stats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update access to defensive stats" 
ON public.defensive_stats 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_player_game_logs_updated_at
BEFORE UPDATE ON public.player_game_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate hit rate
CREATE OR REPLACE FUNCTION public.calculate_hit_rate(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_line FLOAT,
  p_direction VARCHAR(8),
  p_games_limit INT DEFAULT NULL
)
RETURNS TABLE(hits INT, total INT, hit_rate FLOAT) AS $$
DECLARE
  game_logs RECORD;
  hit_count INT := 0;
  total_count INT := 0;
BEGIN
  -- Get game logs for the player and prop type, ordered by date DESC
  FOR game_logs IN
    SELECT value, date
    FROM public.player_game_logs
    WHERE player_id = p_player_id 
      AND prop_type = p_prop_type
    ORDER BY date DESC
    LIMIT COALESCE(p_games_limit, 1000)
  LOOP
    total_count := total_count + 1;
    
    -- Check if the value hit the line
    IF (p_direction = 'over' AND game_logs.value > p_line) OR
       (p_direction = 'under' AND game_logs.value < p_line) THEN
      hit_count := hit_count + 1;
    END IF;
  END LOOP;
  
  -- Return results
  hits := hit_count;
  total := total_count;
  hit_rate := CASE WHEN total_count > 0 THEN hit_count::FLOAT / total_count ELSE 0.0 END;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate streak
CREATE OR REPLACE FUNCTION public.calculate_streak(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_line FLOAT,
  p_direction VARCHAR(8)
)
RETURNS TABLE(current_streak INT, longest_streak INT, streak_direction VARCHAR(8)) AS $$
DECLARE
  game_logs RECORD;
  current_streak_count INT := 0;
  longest_streak_count INT := 0;
  current_direction VARCHAR(8) := p_direction;
  hit BOOLEAN;
BEGIN
  -- Get game logs for the player and prop type, ordered by date DESC
  FOR game_logs IN
    SELECT value, date
    FROM public.player_game_logs
    WHERE player_id = p_player_id 
      AND prop_type = p_prop_type
    ORDER BY date DESC
  LOOP
    -- Check if the value hit the line
    hit := (p_direction = 'over' AND game_logs.value > p_line) OR
           (p_direction = 'under' AND game_logs.value < p_line);
    
    IF hit THEN
      current_streak_count := current_streak_count + 1;
      IF current_streak_count > longest_streak_count THEN
        longest_streak_count := current_streak_count;
      END IF;
    ELSE
      current_streak_count := 0;
    END IF;
  END LOOP;
  
  -- Return results
  current_streak := current_streak_count;
  longest_streak := longest_streak_count;
  streak_direction := current_direction;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to get defensive rank
CREATE OR REPLACE FUNCTION public.get_defensive_rank(
  p_team VARCHAR(8),
  p_opponent VARCHAR(8),
  p_prop_type VARCHAR(64),
  p_position VARCHAR(8),
  p_season INT DEFAULT 2025
)
RETURNS TABLE(rank INT, display VARCHAR(16)) AS $$
DECLARE
  defensive_rank RECORD;
BEGIN
  -- Get defensive rank for the specific matchup
  SELECT ds.rank, 
         CASE 
           WHEN ds.rank IS NULL THEN 'N/A'
           WHEN ds.rank <= 5 THEN 'Top 5'
           WHEN ds.rank <= 10 THEN 'Top 10'
           WHEN ds.rank <= 15 THEN 'Top 15'
           WHEN ds.rank <= 20 THEN 'Top 20'
           ELSE 'Bottom 10'
         END as display
  INTO defensive_rank
  FROM public.defensive_stats ds
  WHERE ds.team = p_team
    AND ds.opponent = p_opponent
    AND ds.prop_type = p_prop_type
    AND ds.position = p_position
    AND ds.season = p_season
  LIMIT 1;
  
  -- Return results
  rank := COALESCE(defensive_rank.rank, 0);
  display := COALESCE(defensive_rank.display, 'N/A');
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to update analytics for a player
CREATE OR REPLACE FUNCTION public.update_player_analytics(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_line FLOAT,
  p_direction VARCHAR(8) DEFAULT 'over'
)
RETURNS VOID AS $$
DECLARE
  season_stats RECORD;
  h2h_stats RECORD;
  l5_stats RECORD;
  l10_stats RECORD;
  l20_stats RECORD;
  streak_stats RECORD;
  defensive_rank_stats RECORD;
  player_info RECORD;
BEGIN
  -- Get player info
  SELECT player_name, team, sport, position
  INTO player_info
  FROM public.player_game_logs
  WHERE player_id = p_player_id
  LIMIT 1;
  
  IF player_info IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate season hit rate (2025)
  SELECT * INTO season_stats
  FROM public.calculate_hit_rate(p_player_id, p_prop_type, p_line, p_direction, 1000)
  WHERE EXISTS (
    SELECT 1 FROM public.player_game_logs 
    WHERE player_id = p_player_id 
      AND prop_type = p_prop_type 
      AND season = 2025
  );
  
  -- Calculate H2H hit rate
  SELECT * INTO h2h_stats
  FROM public.calculate_hit_rate(p_player_id, p_prop_type, p_line, p_direction, 1000)
  WHERE EXISTS (
    SELECT 1 FROM public.player_game_logs 
    WHERE player_id = p_player_id 
      AND prop_type = p_prop_type
  );
  
  -- Calculate L5, L10, L20 hit rates
  SELECT * INTO l5_stats
  FROM public.calculate_hit_rate(p_player_id, p_prop_type, p_line, p_direction, 5);
  
  SELECT * INTO l10_stats
  FROM public.calculate_hit_rate(p_player_id, p_prop_type, p_line, p_direction, 10);
  
  SELECT * INTO l20_stats
  FROM public.calculate_hit_rate(p_player_id, p_prop_type, p_line, p_direction, 20);
  
  -- Calculate streak
  SELECT * INTO streak_stats
  FROM public.calculate_streak(p_player_id, p_prop_type, p_line, p_direction);
  
  -- Get defensive rank
  SELECT * INTO defensive_rank_stats
  FROM public.get_defensive_rank(player_info.team, 'OPP', p_prop_type, player_info.position, 2025);
  
  -- Upsert analytics
  INSERT INTO public.player_analytics (
    player_id, player_name, team, prop_type, sport, position,
    season_hit_rate_2025, season_games_2025,
    h2h_hit_rate, h2h_games,
    l5_hit_rate, l5_games,
    l10_hit_rate, l10_games,
    l20_hit_rate, l20_games,
    current_streak, longest_streak, streak_direction,
    matchup_defensive_rank, matchup_rank_display,
    last_updated
  ) VALUES (
    p_player_id, player_info.player_name, player_info.team, p_prop_type, player_info.sport, player_info.position,
    COALESCE(season_stats.hit_rate, 0), COALESCE(season_stats.total, 0),
    COALESCE(h2h_stats.hit_rate, 0), COALESCE(h2h_stats.total, 0),
    COALESCE(l5_stats.hit_rate, 0), COALESCE(l5_stats.total, 0),
    COALESCE(l10_stats.hit_rate, 0), COALESCE(l10_stats.total, 0),
    COALESCE(l20_stats.hit_rate, 0), COALESCE(l20_stats.total, 0),
    COALESCE(streak_stats.current_streak, 0), COALESCE(streak_stats.longest_streak, 0), COALESCE(streak_stats.streak_direction, p_direction),
    COALESCE(defensive_rank_stats.rank, 0), COALESCE(defensive_rank_stats.display, 'N/A'),
    NOW()
  )
  ON CONFLICT (player_id, prop_type, sport)
  DO UPDATE SET
    season_hit_rate_2025 = EXCLUDED.season_hit_rate_2025,
    season_games_2025 = EXCLUDED.season_games_2025,
    h2h_hit_rate = EXCLUDED.h2h_hit_rate,
    h2h_games = EXCLUDED.h2h_games,
    l5_hit_rate = EXCLUDED.l5_hit_rate,
    l5_games = EXCLUDED.l5_games,
    l10_hit_rate = EXCLUDED.l10_hit_rate,
    l10_games = EXCLUDED.l10_games,
    l20_hit_rate = EXCLUDED.l20_hit_rate,
    l20_games = EXCLUDED.l20_games,
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    streak_direction = EXCLUDED.streak_direction,
    matchup_defensive_rank = EXCLUDED.matchup_defensive_rank,
    matchup_rank_display = EXCLUDED.matchup_rank_display,
    last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- Create function to get chart data for a player
CREATE OR REPLACE FUNCTION public.get_player_chart_data(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_limit INT DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  chart_data JSONB := '[]'::JSONB;
  game_log RECORD;
BEGIN
  -- Get recent game logs for chart data
  FOR game_log IN
    SELECT date, value
    FROM public.player_game_logs
    WHERE player_id = p_player_id 
      AND prop_type = p_prop_type
    ORDER BY date DESC
    LIMIT p_limit
  LOOP
    chart_data := chart_data || jsonb_build_object(
      'x', game_log.date,
      'y', game_log.value
    );
  END LOOP;
  
  RETURN chart_data;
END;
$$ LANGUAGE plpgsql;

-- Insert sample defensive stats for testing
INSERT INTO public.defensive_stats (team, opponent, season, sport, prop_type, position, rank, avg_allowed, games_played) VALUES
-- NFL Defensive Rankings for Passing Yards
('KC', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 1, 180.5, 10),
('BUF', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 2, 185.2, 10),
('SF', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 3, 190.1, 10),
('DAL', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 4, 195.3, 10),
('PHI', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 5, 200.7, 10),
('LAR', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 6, 205.2, 10),
('BAL', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 7, 210.8, 10),
('MIA', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 8, 215.5, 10),
('NE', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 9, 220.1, 10),
('NYJ', 'OPP', 2025, 'NFL', 'Passing Yards', 'QB', 10, 225.3, 10),

-- NFL Defensive Rankings for Rushing Yards
('KC', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 1, 85.2, 10),
('BUF', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 2, 90.1, 10),
('SF', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 3, 95.3, 10),
('DAL', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 4, 100.7, 10),
('PHI', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 5, 105.2, 10),
('LAR', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 6, 110.8, 10),
('BAL', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 7, 115.5, 10),
('MIA', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 8, 120.1, 10),
('NE', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 9, 125.3, 10),
('NYJ', 'OPP', 2025, 'NFL', 'Rushing Yards', 'RB', 10, 130.7, 10),

-- NFL Defensive Rankings for Receiving Yards
('KC', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 1, 150.3, 10),
('BUF', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 2, 155.7, 10),
('SF', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 3, 160.2, 10),
('DAL', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 4, 165.8, 10),
('PHI', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 5, 170.1, 10),
('LAR', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 6, 175.5, 10),
('BAL', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 7, 180.2, 10),
('MIA', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 8, 185.7, 10),
('NE', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 9, 190.3, 10),
('NYJ', 'OPP', 2025, 'NFL', 'Receiving Yards', 'WR', 10, 195.8, 10);

-- Create a view for easy analytics access
CREATE OR REPLACE VIEW public.player_analytics_view AS
SELECT 
  pa.*,
  pgl.player_name as current_player_name,
  pgl.team as current_team,
  pgl.sport as current_sport,
  pgl.position as current_position
FROM public.player_analytics pa
LEFT JOIN public.player_game_logs pgl ON pa.player_id = pgl.player_id
GROUP BY pa.id, pa.player_id, pa.player_name, pa.team, pa.prop_type, pa.sport, pa.position,
         pa.season_hit_rate_2025, pa.season_games_2025, pa.h2h_hit_rate, pa.h2h_games,
         pa.l5_hit_rate, pa.l5_games, pa.l10_hit_rate, pa.l10_games, pa.l20_hit_rate, pa.l20_games,
         pa.current_streak, pa.longest_streak, pa.streak_direction, pa.matchup_defensive_rank,
         pa.matchup_rank_display, pa.chart_data, pa.last_updated, pa.created_at;

-- Grant necessary permissions
GRANT SELECT ON public.player_game_logs TO authenticated;
GRANT SELECT ON public.player_analytics TO authenticated;
GRANT SELECT ON public.defensive_stats TO authenticated;
GRANT SELECT ON public.player_analytics_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_hit_rate TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_streak TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_defensive_rank TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_chart_data TO authenticated;
