-- Add performance indexes for fast analytics queries
-- These indexes will make PlayerGameLogs queries much faster

-- Index for player-season queries (used in analytics calculations)
CREATE INDEX IF NOT EXISTS idx_player_season ON playergamelogs(player_id, season);

-- Index for player-opponent queries (used in H2H analytics)
CREATE INDEX IF NOT EXISTS idx_player_opponent ON playergamelogs(player_id, opponent);

-- Index for player-date queries (used in recent games and streak calculations)
CREATE INDEX IF NOT EXISTS idx_player_date ON playergamelogs(player_id, date);

-- Index for player-prop_type queries (used in specific prop analytics)
CREATE INDEX IF NOT EXISTS idx_player_prop_type ON playergamelogs(player_id, prop_type);

-- Index for team-season queries (used in team analytics)
CREATE INDEX IF NOT EXISTS idx_team_season ON playergamelogs(team, season);

-- Index for date-season queries (used in temporal analytics)
CREATE INDEX IF NOT EXISTS idx_date_season ON playergamelogs(date, season);

-- Composite index for complex analytics queries
CREATE INDEX IF NOT EXISTS idx_player_prop_season ON playergamelogs(player_id, prop_type, season);

-- Index for sport-specific queries
CREATE INDEX IF NOT EXISTS idx_sport_season ON playergamelogs(sport, season);

-- Index for value-based queries (used in hit rate calculations)
CREATE INDEX IF NOT EXISTS idx_prop_type_value ON playergamelogs(prop_type, value);

-- Index for date-based queries (used in recent performance)
CREATE INDEX IF NOT EXISTS idx_date_desc ON playergamelogs(date DESC);

-- Grant permissions for analytics queries
GRANT SELECT ON playergamelogs TO anon;
GRANT SELECT ON playergamelogs TO authenticated;

-- Add comments for documentation
COMMENT ON INDEX idx_player_season IS 'Fast lookup for player performance by season';
COMMENT ON INDEX idx_player_opponent IS 'Fast lookup for head-to-head performance';
COMMENT ON INDEX idx_player_date IS 'Fast lookup for recent games and streaks';
COMMENT ON INDEX idx_player_prop_type IS 'Fast lookup for specific prop type performance';
COMMENT ON INDEX idx_team_season IS 'Fast lookup for team performance by season';
COMMENT ON INDEX idx_date_season IS 'Fast lookup for temporal analytics';
COMMENT ON INDEX idx_player_prop_season IS 'Composite index for complex analytics queries';
COMMENT ON INDEX idx_sport_season IS 'Fast lookup for sport-specific data';
COMMENT ON INDEX idx_prop_type_value IS 'Fast lookup for value-based analytics';
COMMENT ON INDEX idx_date_desc IS 'Fast lookup for recent performance (descending date)';
