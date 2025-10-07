-- Enhance PlayerAnalytics table with additional analytics fields
-- Add new columns for enhanced analytics calculations

-- Add new columns to playeranalytics table
ALTER TABLE playeranalytics 
ADD COLUMN IF NOT EXISTS avg_value_l5 DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS avg_value_l10 DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS avg_value_season DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS consistency_l10 DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS consistency_season DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS trend VARCHAR(20) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS trend_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trend_difference DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS edge DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS kelly_criterion DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS most_recent_over_odds INTEGER,
ADD COLUMN IF NOT EXISTS most_recent_under_odds INTEGER,
ADD COLUMN IF NOT EXISTS games_with_lines INTEGER DEFAULT 0;

-- Add comments to document the new fields
COMMENT ON COLUMN playeranalytics.avg_value_l5 IS 'Average actual value over last 5 games';
COMMENT ON COLUMN playeranalytics.avg_value_l10 IS 'Average actual value over last 10 games';
COMMENT ON COLUMN playeranalytics.avg_value_season IS 'Average actual value for the season';
COMMENT ON COLUMN playeranalytics.consistency_l10 IS 'Consistency score (0-100) over last 10 games';
COMMENT ON COLUMN playeranalytics.consistency_season IS 'Consistency score (0-100) for the season';
COMMENT ON COLUMN playeranalytics.trend IS 'Trend direction: improving, declining, or neutral';
COMMENT ON COLUMN playeranalytics.trend_strength IS 'Trend strength (0-100)';
COMMENT ON COLUMN playeranalytics.trend_difference IS 'Difference between recent and overall performance';
COMMENT ON COLUMN playeranalytics.edge IS 'Betting edge percentage vs implied probability';
COMMENT ON COLUMN playeranalytics.kelly_criterion IS 'Kelly criterion percentage for optimal bet sizing';
COMMENT ON COLUMN playeranalytics.most_recent_over_odds IS 'Most recent over odds from sportsbook';
COMMENT ON COLUMN playeranalytics.most_recent_under_odds IS 'Most recent under odds from sportsbook';
COMMENT ON COLUMN playeranalytics.games_with_lines IS 'Number of games with available prop lines';

-- Create indexes for new analytics fields
CREATE INDEX IF NOT EXISTS idx_analytics_trend ON playeranalytics(trend);
CREATE INDEX IF NOT EXISTS idx_analytics_edge ON playeranalytics(edge);
CREATE INDEX IF NOT EXISTS idx_analytics_kelly ON playeranalytics(kelly_criterion);
CREATE INDEX IF NOT EXISTS idx_analytics_games_with_lines ON playeranalytics(games_with_lines);

-- Create function to get analytics summary for a player/prop
CREATE OR REPLACE FUNCTION get_player_analytics_summary(
  p_player_id VARCHAR(64),
  p_prop_type VARCHAR(64),
  p_season INTEGER DEFAULT 2025
)
RETURNS TABLE(
  direction VARCHAR(8),
  season_pct FLOAT,
  l10_pct FLOAT,
  l5_pct FLOAT,
  streak_current INTEGER,
  edge DECIMAL(5,2),
  trend VARCHAR(20),
  games_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.direction,
    pa.season_pct,
    pa.l10_pct,
    pa.l5_pct,
    pa.streak_current,
    pa.edge,
    pa.trend,
    pa.games_with_lines
  FROM playeranalytics pa
  WHERE pa.player_id = p_player_id 
    AND pa.prop_type = p_prop_type 
    AND pa.season = p_season
  ORDER BY pa.direction;
END;
$$;

-- Create function to get top performers by hit rate
CREATE OR REPLACE FUNCTION get_top_performers(
  p_prop_type VARCHAR(64),
  p_direction VARCHAR(8),
  p_season INTEGER DEFAULT 2025,
  p_min_games INTEGER DEFAULT 5,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  player_name VARCHAR(128),
  season_pct FLOAT,
  l10_pct FLOAT,
  l5_pct FLOAT,
  streak_current INTEGER,
  edge DECIMAL(5,2),
  games_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.player_name,
    pa.season_pct,
    pa.l10_pct,
    pa.l5_pct,
    pa.streak_current,
    pa.edge,
    pa.games_with_lines
  FROM playeranalytics pa
  WHERE pa.prop_type = p_prop_type 
    AND pa.direction = p_direction
    AND pa.season = p_season
    AND pa.season_total >= p_min_games
  ORDER BY pa.season_pct DESC
  LIMIT p_limit;
END;
$$;

-- Create function to get betting opportunities (high edge, good hit rate)
CREATE OR REPLACE FUNCTION get_betting_opportunities(
  p_min_edge DECIMAL(5,2) DEFAULT 5.0,
  p_min_hit_rate DECIMAL(5,2) DEFAULT 60.0,
  p_min_games INTEGER DEFAULT 10,
  p_season INTEGER DEFAULT 2025,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  player_name VARCHAR(128),
  prop_type VARCHAR(64),
  direction VARCHAR(8),
  line FLOAT,
  season_pct FLOAT,
  edge DECIMAL(5,2),
  kelly_criterion DECIMAL(5,2),
  games_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.player_name,
    pa.prop_type,
    pa.direction,
    pa.line,
    pa.season_pct,
    pa.edge,
    pa.kelly_criterion,
    pa.games_with_lines
  FROM playeranalytics pa
  WHERE pa.season = p_season
    AND pa.season_total >= p_min_games
    AND pa.edge >= p_min_edge
    AND pa.season_pct >= p_min_hit_rate
  ORDER BY pa.edge DESC, pa.season_pct DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_player_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_analytics_summary TO anon;
GRANT EXECUTE ON FUNCTION get_top_performers TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performers TO anon;
GRANT EXECUTE ON FUNCTION get_betting_opportunities TO authenticated;
GRANT EXECUTE ON FUNCTION get_betting_opportunities TO anon;
