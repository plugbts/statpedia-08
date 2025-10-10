-- Optimized Query Strategy for Proplines and Player Game Logs
-- This implements the progressive matching approach with flexible date tolerance

-- Create the normalize_prop_type function if it doesn't exist
CREATE OR REPLACE FUNCTION normalize_prop_type(prop_type TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalize prop types to ensure consistent matching
  RETURN LOWER(TRIM(COALESCE(prop_type, '')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Optimized query with progressive matching approach
-- This replaces the brittle single join with flexible matching conditions
SELECT 
  p.*,
  g.*
FROM proplines p
JOIN player_game_logs g
  ON g.player_id = p.player_id
 AND g.league = LOWER(p.league)
 AND g.season = p.season
 -- Flexible date tolerance (±1 day)
 AND g.date BETWEEN (p.date_normalized - INTERVAL '1 day')
                 AND (p.date_normalized + INTERVAL '1 day')
 -- Normalized prop type matching
 AND normalize_prop_type(g.prop_type) = normalize_prop_type(p.prop_type)
WHERE p.league = $1  -- league parameter
  AND p.season = $2  -- season parameter
  AND p.date_normalized >= $3  -- start date parameter
  AND p.date_normalized <= $4  -- end date parameter
ORDER BY p.player_name, p.prop_type, p.date_normalized;

-- Alternative version for cases where date_normalized might not exist
SELECT 
  p.*,
  g.*
FROM proplines p
JOIN player_game_logs g
  ON g.player_id = p.player_id
 AND g.league = LOWER(p.league)
 AND g.season = p.season
 -- Flexible date tolerance using regular date column
 AND g.date BETWEEN (p.date - INTERVAL '1 day')
                 AND (p.date + INTERVAL '1 day')
 -- Normalized prop type matching
 AND normalize_prop_type(g.prop_type) = normalize_prop_type(p.prop_type)
WHERE p.league = $1  -- league parameter
  AND p.season = $2  -- season parameter
  AND p.date >= $3   -- start date parameter
  AND p.date <= $4   -- end date parameter
ORDER BY p.player_name, p.prop_type, p.date;

-- Function to get player props with flexible matching
CREATE OR REPLACE FUNCTION get_player_props_with_game_logs(
  p_league TEXT,
  p_season INTEGER,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE (
  prop_id INTEGER,
  player_id TEXT,
  player_name TEXT,
  team TEXT,
  opponent TEXT,
  prop_type TEXT,
  line DECIMAL,
  over_odds INTEGER,
  under_odds INTEGER,
  sportsbook TEXT,
  game_date DATE,
  actual_value FLOAT,
  hit_over BOOLEAN,
  hit_under BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as prop_id,
    p.player_id,
    p.player_name,
    p.team,
    p.opponent,
    p.prop_type,
    p.line,
    p.over_odds,
    p.under_odds,
    p.sportsbook,
    p.date as game_date,
    g.value as actual_value,
    (g.value > p.line) as hit_over,
    (g.value < p.line) as hit_under
  FROM proplines p
  JOIN player_game_logs g
    ON g.player_id = p.player_id
   AND g.league = LOWER(p.league)
   AND g.season = p.season
   -- Flexible date tolerance (±1 day)
   AND g.date BETWEEN (p.date - INTERVAL '1 day')
                   AND (p.date + INTERVAL '1 day')
   -- Normalized prop type matching
   AND normalize_prop_type(g.prop_type) = normalize_prop_type(p.prop_type)
  WHERE p.league = p_league
    AND p.season = p_season
    AND p.date >= p_date_from
    AND p.date <= p_date_to
  ORDER BY p.player_name, p.prop_type, p.date;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION normalize_prop_type(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION normalize_prop_type(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_props_with_game_logs(TEXT, INTEGER, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_player_props_with_game_logs(TEXT, INTEGER, DATE, DATE) TO authenticated;
