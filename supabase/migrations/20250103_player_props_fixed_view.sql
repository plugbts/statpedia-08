-- Create player_props_fixed view for clean, stable player props data
-- This view builds on the existing player_props_api_view and adds clean data

-- Create a simple view that extends the existing API view with clean data
CREATE OR REPLACE VIEW player_props_fixed AS
SELECT 
  -- Basic prop info (from existing view)
  p.prop_id,
  p.player_id,
  p.prop_type,
  p.line,
  p.odds,
  p.stat_value,
  p.game_date,
  p.team_id,
  p.opponent_team_id,
  p.league,
  p.season,
  p.prop_date,
  
  -- Clean player name (no prop concatenation)
  COALESCE(pl.display_name, p.player_id) as player_name,
  
  -- Team abbreviations (use existing team_id as abbreviation)
  p.team_id as team_abbr,
  p.opponent_team_id as opponent_abbr,
  
  -- Team logos (simple ESPN URLs)
  CASE 
    WHEN p.team_id IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.team_id) || '.png'
    ELSE NULL
  END as team_logo,
  CASE 
    WHEN p.opponent_team_id IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.opponent_team_id) || '.png'
    ELSE NULL
  END as opponent_logo,
  
  -- Streaks (will be calculated in the worker)
  '0/5' as last5_streak,
  '0/10' as last10_streak,
  '0/20' as last20_streak,
  '0/0' as h2h_streak,
  
  -- EV% (will be calculated in worker)
  0.0 as ev_percent,
  
  -- Additional fields for compatibility
  p.line as over_odds,
  p.line as under_odds,
  'Consensus' as sportsbook,
  p.game_id,
  p.prop_date as date,
  p.league as sport
  
FROM player_props_api_view p
LEFT JOIN players pl ON pl.id::text = p.player_id
WHERE p.league IS NOT NULL
  AND p.prop_date IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_props_fixed_player_league_date 
ON player_game_logs (player_id, sport, date DESC);

CREATE INDEX IF NOT EXISTS idx_player_props_fixed_prop_type 
ON player_game_logs (prop_type, sport);

CREATE INDEX IF NOT EXISTS idx_player_props_fixed_opponent 
ON player_game_logs (player_id, opponent, date DESC);

-- Grant permissions
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;
