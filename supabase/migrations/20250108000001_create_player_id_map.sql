-- Create player_id_map table for normalizing player IDs across different data sources
CREATE TABLE IF NOT EXISTS player_id_map (
  id SERIAL PRIMARY KEY,
  source VARCHAR(32) NOT NULL, -- 'logs', 'props', 'v1', 'v2', etc.
  source_player_id VARCHAR(128) NOT NULL,
  canonical_player_id VARCHAR(128) NOT NULL,
  player_name VARCHAR(128),
  team VARCHAR(8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate mappings
  UNIQUE(source, source_player_id),
  
  -- Index for lookups
  INDEX idx_player_id_map_source_id (source, source_player_id),
  INDEX idx_player_id_map_canonical (canonical_player_id)
);

-- Enable RLS
ALTER TABLE player_id_map ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access
CREATE POLICY "Allow all access to player_id_map" ON player_id_map FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON player_id_map TO anon;
GRANT ALL ON player_id_map TO authenticated;
GRANT USAGE ON SEQUENCE player_id_map_id_seq TO anon;
GRANT USAGE ON SEQUENCE player_id_map_id_seq TO authenticated;
