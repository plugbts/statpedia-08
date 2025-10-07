-- Create RPC functions for analytics calculations

-- Function to calculate hit rate for a player
CREATE OR REPLACE FUNCTION calculate_hit_rate(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_line FLOAT,
  p_direction VARCHAR(8),
  p_games_limit INTEGER DEFAULT NULL
)
RETURNS TABLE(hits INTEGER, total INTEGER, hit_rate FLOAT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_hits INTEGER := 0;
  v_total INTEGER := 0;
  v_hit_rate FLOAT := 0.0;
  v_query TEXT;
BEGIN
  -- Build dynamic query based on games limit
  v_query := '
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN ' || 
        CASE 
          WHEN p_direction = 'over' THEN 'value > ' || p_line
          WHEN p_direction = 'under' THEN 'value < ' || p_line
          ELSE 'FALSE'
        END || ' THEN 1 END) as hits
    FROM PlayerGameLogs 
    WHERE player_id = $1 AND prop_type = $2';
  
  -- Add games limit if specified
  IF p_games_limit IS NOT NULL THEN
    v_query := v_query || ' ORDER BY date DESC LIMIT ' || p_games_limit;
  END IF;
  
  -- Execute query
  EXECUTE v_query INTO v_total, v_hits USING p_player_id, p_prop_type;
  
  -- Calculate hit rate
  IF v_total > 0 THEN
    v_hit_rate := (v_hits::FLOAT / v_total::FLOAT);
  END IF;
  
  -- Return results
  RETURN QUERY SELECT v_hits, v_total, v_hit_rate;
END;
$$;

-- Function to calculate streak for a player
CREATE OR REPLACE FUNCTION calculate_streak(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_line FLOAT,
  p_direction VARCHAR(8)
)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, streak_direction VARCHAR(16))
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_streak_direction VARCHAR(16) := 'mixed';
  v_game_record RECORD;
  v_prev_hit BOOLEAN := NULL;
  v_temp_streak INTEGER := 0;
BEGIN
  -- Get games ordered by date descending (most recent first)
  FOR v_game_record IN
    SELECT value, date
    FROM PlayerGameLogs 
    WHERE player_id = p_player_id AND prop_type = p_prop_type
    ORDER BY date DESC
  LOOP
    -- Check if this game was a hit
    DECLARE
      v_is_hit BOOLEAN;
    BEGIN
      IF p_direction = 'over' THEN
        v_is_hit := v_game_record.value > p_line;
      ELSIF p_direction = 'under' THEN
        v_is_hit := v_game_record.value < p_line;
      ELSE
        v_is_hit := FALSE;
      END IF;
      
      -- If this is the first game or same hit type as previous
      IF v_prev_hit IS NULL OR v_prev_hit = v_is_hit THEN
        IF v_is_hit THEN
          v_temp_streak := v_temp_streak + 1;
          -- Set streak direction
          IF v_prev_hit IS NULL THEN
            v_streak_direction := p_direction || '_hit';
          END IF;
        ELSE
          v_temp_streak := 0;
          v_streak_direction := 'mixed';
        END IF;
      ELSE
        -- Different hit type, reset streak
        IF v_is_hit THEN
          v_temp_streak := 1;
          v_streak_direction := p_direction || '_hit';
        ELSE
          v_temp_streak := 0;
          v_streak_direction := 'mixed';
        END IF;
      END IF;
      
      -- Update longest streak
      IF v_temp_streak > v_longest_streak THEN
        v_longest_streak := v_temp_streak;
      END IF;
      
      -- Set current streak (from most recent games)
      IF v_prev_hit IS NULL THEN
        v_current_streak := v_temp_streak;
      END IF;
      
      v_prev_hit := v_is_hit;
    END;
  END LOOP;
  
  -- Return results
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_streak_direction;
END;
$$;

-- Function to get defensive rank for a matchup
CREATE OR REPLACE FUNCTION get_defensive_rank(
  p_team VARCHAR(8),
  p_opponent VARCHAR(8),
  p_prop_type VARCHAR(64),
  p_position VARCHAR(8),
  p_season INTEGER DEFAULT 2025
)
RETURNS TABLE(rank INTEGER, display VARCHAR(16))
LANGUAGE plpgsql
AS $$
DECLARE
  v_rank INTEGER := 0;
  v_display VARCHAR(16) := 'N/A';
  v_opponent_stats RECORD;
  v_team_count INTEGER;
BEGIN
  -- For now, return a placeholder rank
  -- In a real implementation, this would calculate actual defensive rankings
  -- based on historical performance against the specific prop type and position
  
  -- Count how many teams have data for this prop type and position
  SELECT COUNT(DISTINCT team) INTO v_team_count
  FROM PlayerGameLogs 
  WHERE season = p_season 
    AND prop_type = p_prop_type 
    AND position = p_position;
  
  -- Generate a mock rank (1-32 for NFL, 1-30 for NBA, etc.)
  IF v_team_count > 0 THEN
    v_rank := (p_team::TEXT ~ '[0-9]'::TEXT)::INTEGER + 1; -- Simple hash-based rank
    IF v_rank > v_team_count THEN
      v_rank := v_team_count;
    END IF;
    v_display := v_rank::TEXT || '/' || v_team_count::TEXT;
  ELSE
    v_rank := 0;
    v_display := 'N/A';
  END IF;
  
  -- Return results
  RETURN QUERY SELECT v_rank, v_display;
END;
$$;

-- Function to get player chart data
CREATE OR REPLACE FUNCTION get_player_chart_data(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(x VARCHAR(10), y FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date::VARCHAR(10) as x,
    value as y
  FROM PlayerGameLogs 
  WHERE player_id = p_player_id 
    AND prop_type = p_prop_type
  ORDER BY date DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_hit_rate TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_streak TO authenticated;
GRANT EXECUTE ON FUNCTION get_defensive_rank TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_chart_data TO authenticated;
