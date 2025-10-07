-- Create playeranalytics table for precomputed analytics
CREATE TABLE IF NOT EXISTS playeranalytics (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  player_name VARCHAR(128),
  prop_type VARCHAR(64) NOT NULL,
  line FLOAT NOT NULL,
  direction VARCHAR(8) NOT NULL, -- 'over' or 'under'
  
  -- Precomputed analytics
  matchup_rank_value INT,
  matchup_rank_display VARCHAR(16),
  
  -- Hit rates
  season_hits INT DEFAULT 0,
  season_total INT DEFAULT 0,
  season_pct FLOAT DEFAULT 0.0,
  
  h2h_hits INT DEFAULT 0,
  h2h_total INT DEFAULT 0,
  h2h_pct FLOAT DEFAULT 0.0,
  
  l5_hits INT DEFAULT 0,
  l5_total INT DEFAULT 0,
  l5_pct FLOAT DEFAULT 0.0,
  
  l10_hits INT DEFAULT 0,
  l10_total INT DEFAULT 0,
  l10_pct FLOAT DEFAULT 0.0,
  
  l20_hits INT DEFAULT 0,
  l20_total INT DEFAULT 0,
  l20_pct FLOAT DEFAULT 0.0,
  
  -- Streak data
  streak_current INT DEFAULT 0,
  streak_longest INT DEFAULT 0,
  streak_direction VARCHAR(16) DEFAULT 'mixed',
  
  -- Chart data (JSON)
  chart_data JSONB,
  
  -- Metadata
  last_computed_at TIMESTAMP DEFAULT NOW(),
  season INT DEFAULT 2025,
  sport VARCHAR(8) DEFAULT 'nfl',
  
  -- Unique constraint
  UNIQUE(player_id, prop_type, line, direction),
  
  -- Indexes for performance
  INDEX idx_player_prop (player_id, prop_type),
  INDEX idx_computed_at (last_computed_at),
  INDEX idx_season_sport (season, sport)
);

-- Enable RLS
ALTER TABLE playeranalytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for anonymous access
CREATE POLICY "Allow all access to playeranalytics" ON playeranalytics
FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON playeranalytics TO anon;
GRANT ALL ON playeranalytics TO authenticated;
GRANT USAGE ON SEQUENCE playeranalytics_id_seq TO anon;
GRANT USAGE ON SEQUENCE playeranalytics_id_seq TO authenticated;
