-- Analytics Schema Migration (Fixed) for PropFinder-style Analytics
-- Extends props table with comprehensive analytics columns

-- 1. Extend props table with analytics columns
ALTER TABLE props
  ADD COLUMN IF NOT EXISTS hit_rate_l5 NUMERIC,           -- Last 5 games hit rate
  ADD COLUMN IF NOT EXISTS hit_rate_l10 NUMERIC,          -- Last 10 games hit rate  
  ADD COLUMN IF NOT EXISTS hit_rate_l20 NUMERIC,          -- Last 20 games hit rate
  ADD COLUMN IF NOT EXISTS streak_current INT,            -- Current streak (positive = overs, negative = unders)
  ADD COLUMN IF NOT EXISTS h2h_hit_rate NUMERIC,          -- Head-to-head hit rate vs opponent
  ADD COLUMN IF NOT EXISTS matchup_rank INT,              -- Opponent defensive rank vs prop type
  ADD COLUMN IF NOT EXISTS matchup_grade NUMERIC,         -- Normalized matchup grade 0-100
  ADD COLUMN IF NOT EXISTS historical_average NUMERIC,    -- Player's historical average for this prop type
  ADD COLUMN IF NOT EXISTS games_tracked INT DEFAULT 0;   -- Number of games tracked

-- 2. Create player_game_logs table for historical performance data
CREATE TABLE IF NOT EXISTS player_game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  opponent_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  prop_type TEXT NOT NULL,
  line NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,           -- What the player actually achieved
  hit BOOLEAN NOT NULL,                    -- Did they hit the over?
  game_date DATE NOT NULL,
  season TEXT NOT NULL,
  home_away TEXT NOT NULL CHECK (home_away IN ('home', 'away')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for performance
  CONSTRAINT unique_player_game_log UNIQUE(player_id, game_id, prop_type, line)
);

-- 3. Create defense_ranks table for opponent defensive rankings
CREATE TABLE IF NOT EXISTS defense_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id INT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  prop_type TEXT NOT NULL,
  rank INT NOT NULL,                       -- 1 = best defense, 32 = worst
  rank_percentile NUMERIC NOT NULL,        -- 0-100 percentile
  season TEXT NOT NULL,
  games_tracked INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one ranking per team/prop type/season
  CONSTRAINT unique_defense_rank UNIQUE(team_id, prop_type, season)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_game_logs_player_date ON player_game_logs(player_id, game_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_game_logs_prop_type ON player_game_logs(prop_type);
CREATE INDEX IF NOT EXISTS idx_player_game_logs_opponent ON player_game_logs(opponent_id);
CREATE INDEX IF NOT EXISTS idx_player_game_logs_performance ON player_game_logs(player_id, prop_type, game_date DESC);

CREATE INDEX IF NOT EXISTS idx_defense_ranks_team ON defense_ranks(team_id);
CREATE INDEX IF NOT EXISTS idx_defense_ranks_prop_type ON defense_ranks(prop_type);
CREATE INDEX IF NOT EXISTS idx_defense_ranks_league ON defense_ranks(league_id);
CREATE INDEX IF NOT EXISTS idx_defense_ranks_performance ON defense_ranks(team_id, prop_type, season);

CREATE INDEX IF NOT EXISTS idx_props_analytics ON props(hit_rate_l5, hit_rate_l10, streak_current);

-- 5. Create function to calculate hit rates and streaks
CREATE OR REPLACE FUNCTION calculate_hit_rates_and_streak(
  p_player_id INT,
  p_prop_type TEXT,
  p_line NUMERIC
) RETURNS TABLE (
  hit_rate_l5 NUMERIC,
  hit_rate_l10 NUMERIC,
  hit_rate_l20 NUMERIC,
  streak_current INT,
  historical_average NUMERIC,
  games_tracked INT
) AS $$
DECLARE
  logs RECORD;
  hits INT[];
  streak INT := 0;
  hit_count INT := 0;
  total_value NUMERIC := 0;
  prev_hit BOOLEAN := NULL;
BEGIN
  -- Get recent game logs ordered by date (most recent first)
  FOR logs IN 
    SELECT actual_value, hit
    FROM player_game_logs 
    WHERE player_id = p_player_id 
      AND prop_type = p_prop_type
      AND line = p_line
    ORDER BY game_date DESC
    LIMIT 20
  LOOP
    -- Build hits array (1 for hit, 0 for miss)
    hits := array_append(hits, CASE WHEN logs.hit THEN 1 ELSE 0 END);
    
    -- Calculate streak (current streak from most recent games)
    IF prev_hit IS NULL THEN
      streak := CASE WHEN logs.hit THEN 1 ELSE -1 END;
    ELSIF logs.hit = prev_hit THEN
      streak := streak + CASE WHEN logs.hit THEN 1 ELSE -1 END;
    ELSE
      streak := CASE WHEN logs.hit THEN 1 ELSE -1 END;
    END IF;
    prev_hit := logs.hit;
    
    -- Accumulate for average
    total_value := total_value + logs.actual_value;
    hit_count := hit_count + 1;
  END LOOP;
  
  -- Calculate hit rates for different periods
  RETURN QUERY SELECT
    CASE WHEN array_length(hits, 1) >= 5 THEN 
      (SELECT AVG(h) * 100 FROM unnest(hits[1:5]) AS h) 
    ELSE NULL END as hit_rate_l5,
    
    CASE WHEN array_length(hits, 1) >= 10 THEN 
      (SELECT AVG(h) * 100 FROM unnest(hits[1:10]) AS h) 
    ELSE NULL END as hit_rate_l10,
    
    CASE WHEN array_length(hits, 1) >= 20 THEN 
      (SELECT AVG(h) * 100 FROM unnest(hits[1:20]) AS h) 
    ELSE NULL END as hit_rate_l20,
    
    streak as streak_current,
    
    CASE WHEN hit_count > 0 THEN total_value / hit_count ELSE NULL END as historical_average,
    
    hit_count as games_tracked;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to calculate H2H hit rate vs opponent
CREATE OR REPLACE FUNCTION calculate_h2h_hit_rate(
  p_player_id INT,
  p_prop_type TEXT,
  p_line NUMERIC,
  p_opponent_id INT
) RETURNS NUMERIC AS $$
DECLARE
  h2h_hits INT := 0;
  h2h_total INT := 0;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE hit = true),
    COUNT(*)
  INTO h2h_hits, h2h_total
  FROM player_game_logs 
  WHERE player_id = p_player_id 
    AND prop_type = p_prop_type
    AND line = p_line
    AND opponent_id = p_opponent_id;
  
  RETURN CASE WHEN h2h_total > 0 THEN (h2h_hits::NUMERIC / h2h_total::NUMERIC) * 100 ELSE NULL END;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get matchup grade from defensive rank
CREATE OR REPLACE FUNCTION get_matchup_grade(
  p_opponent_id INT,
  p_prop_type TEXT,
  p_season TEXT DEFAULT '2025'
) RETURNS NUMERIC AS $$
DECLARE
  rank_value INT;
BEGIN
  SELECT rank INTO rank_value
  FROM defense_ranks 
  WHERE team_id = p_opponent_id 
    AND prop_type = p_prop_type 
    AND season = p_season
  LIMIT 1;
  
  -- Convert rank to grade (1 = best defense = low grade, 32 = worst defense = high grade)
  -- Formula: (32 - rank) / 31 * 100, then inverted for grade
  RETURN CASE WHEN rank_value IS NOT NULL THEN 
    100 - ((rank_value - 1)::NUMERIC / 31 * 100) 
  ELSE NULL END;
END;
$$ LANGUAGE plpgsql;

-- 8. Create comprehensive analytics update function
CREATE OR REPLACE FUNCTION update_prop_analytics(p_prop_id UUID) RETURNS VOID AS $$
DECLARE
  prop_record RECORD;
  analytics RECORD;
  h2h_rate NUMERIC;
  matchup_grade NUMERIC;
BEGIN
  -- Get the prop record
  SELECT p.*, pl.team_id, g.away_team_id, g.home_team_id, g.season
  INTO prop_record
  FROM props p
  JOIN players pl ON p.player_id = pl.id
  JOIN games g ON p.game_id = g.id
  WHERE p.id = p_prop_id;
  
  -- Calculate hit rates and streak
  SELECT * INTO analytics
  FROM calculate_hit_rates_and_streak(prop_record.player_id, prop_record.prop_type, prop_record.line);
  
  -- Calculate H2H hit rate
  h2h_rate := calculate_h2h_hit_rate(
    prop_record.player_id, 
    prop_record.prop_type, 
    prop_record.line, 
    CASE WHEN prop_record.team_id = prop_record.home_team_id THEN prop_record.away_team_id ELSE prop_record.home_team_id END
  );
  
  -- Get matchup grade
  matchup_grade := get_matchup_grade(
    CASE WHEN prop_record.team_id = prop_record.home_team_id THEN prop_record.away_team_id ELSE prop_record.home_team_id END,
    prop_record.prop_type,
    prop_record.season
  );
  
  -- Update the prop with analytics
  UPDATE props SET
    hit_rate_l5 = analytics.hit_rate_l5,
    hit_rate_l10 = analytics.hit_rate_l10,
    hit_rate_l20 = analytics.hit_rate_l20,
    streak_current = analytics.streak_current,
    h2h_hit_rate = h2h_rate,
    matchup_grade = matchup_grade,
    historical_average = analytics.historical_average,
    games_tracked = analytics.games_tracked,
    updated_at = NOW()
  WHERE id = p_prop_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE player_game_logs IS 'Historical performance data for players on specific prop types';
COMMENT ON TABLE defense_ranks IS 'Defensive rankings for teams against specific prop types';
COMMENT ON COLUMN props.hit_rate_l5 IS 'Hit rate over last 5 games (0-100)';
COMMENT ON COLUMN props.hit_rate_l10 IS 'Hit rate over last 10 games (0-100)';
COMMENT ON COLUMN props.hit_rate_l20 IS 'Hit rate over last 20 games (0-100)';
COMMENT ON COLUMN props.streak_current IS 'Current streak: positive = overs, negative = unders';
COMMENT ON COLUMN props.h2h_hit_rate IS 'Head-to-head hit rate vs current opponent (0-100)';
COMMENT ON COLUMN props.matchup_rank IS 'Opponent defensive rank vs this prop type (1=best, 32=worst)';
COMMENT ON COLUMN props.matchup_grade IS 'Normalized matchup grade (0-100, higher = better matchup)';
