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
  
  -- Team abbreviations (simple mapping for now)
  CASE 
    WHEN p.team_id = 'ATL' THEN 'ATL'
    WHEN p.team_id = 'BUF' THEN 'BUF'
    WHEN p.team_id = 'CHI' THEN 'CHI'
    WHEN p.team_id = 'CIN' THEN 'CIN'
    WHEN p.team_id = 'CLE' THEN 'CLE'
    WHEN p.team_id = 'DAL' THEN 'DAL'
    WHEN p.team_id = 'DEN' THEN 'DEN'
    WHEN p.team_id = 'DET' THEN 'DET'
    WHEN p.team_id = 'GB' THEN 'GB'
    WHEN p.team_id = 'HOU' THEN 'HOU'
    WHEN p.team_id = 'IND' THEN 'IND'
    WHEN p.team_id = 'JAX' THEN 'JAX'
    WHEN p.team_id = 'KC' THEN 'KC'
    WHEN p.team_id = 'LV' THEN 'LV'
    WHEN p.team_id = 'LAC' THEN 'LAC'
    WHEN p.team_id = 'LAR' THEN 'LAR'
    WHEN p.team_id = 'MIA' THEN 'MIA'
    WHEN p.team_id = 'MIN' THEN 'MIN'
    WHEN p.team_id = 'NE' THEN 'NE'
    WHEN p.team_id = 'NO' THEN 'NO'
    WHEN p.team_id = 'NYG' THEN 'NYG'
    WHEN p.team_id = 'NYJ' THEN 'NYJ'
    WHEN p.team_id = 'PHI' THEN 'PHI'
    WHEN p.team_id = 'PIT' THEN 'PIT'
    WHEN p.team_id = 'SF' THEN 'SF'
    WHEN p.team_id = 'SEA' THEN 'SEA'
    WHEN p.team_id = 'TB' THEN 'TB'
    WHEN p.team_id = 'TEN' THEN 'TEN'
    WHEN p.team_id = 'WAS' THEN 'WAS'
    ELSE UPPER(SUBSTRING(p.team_id, 1, 3))
  END as team_abbr,
  
  CASE 
    WHEN p.opponent_team_id = 'ATL' THEN 'ATL'
    WHEN p.opponent_team_id = 'BUF' THEN 'BUF'
    WHEN p.opponent_team_id = 'CHI' THEN 'CHI'
    WHEN p.opponent_team_id = 'CIN' THEN 'CIN'
    WHEN p.opponent_team_id = 'CLE' THEN 'CLE'
    WHEN p.opponent_team_id = 'DAL' THEN 'DAL'
    WHEN p.opponent_team_id = 'DEN' THEN 'DEN'
    WHEN p.opponent_team_id = 'DET' THEN 'DET'
    WHEN p.opponent_team_id = 'GB' THEN 'GB'
    WHEN p.opponent_team_id = 'HOU' THEN 'HOU'
    WHEN p.opponent_team_id = 'IND' THEN 'IND'
    WHEN p.opponent_team_id = 'JAX' THEN 'JAX'
    WHEN p.opponent_team_id = 'KC' THEN 'KC'
    WHEN p.opponent_team_id = 'LV' THEN 'LV'
    WHEN p.opponent_team_id = 'LAC' THEN 'LAC'
    WHEN p.opponent_team_id = 'LAR' THEN 'LAR'
    WHEN p.opponent_team_id = 'MIA' THEN 'MIA'
    WHEN p.opponent_team_id = 'MIN' THEN 'MIN'
    WHEN p.opponent_team_id = 'NE' THEN 'NE'
    WHEN p.opponent_team_id = 'NO' THEN 'NO'
    WHEN p.opponent_team_id = 'NYG' THEN 'NYG'
    WHEN p.opponent_team_id = 'NYJ' THEN 'NYJ'
    WHEN p.opponent_team_id = 'PHI' THEN 'PHI'
    WHEN p.opponent_team_id = 'PIT' THEN 'PIT'
    WHEN p.opponent_team_id = 'SF' THEN 'SF'
    WHEN p.opponent_team_id = 'SEA' THEN 'SEA'
    WHEN p.opponent_team_id = 'TB' THEN 'TB'
    WHEN p.opponent_team_id = 'TEN' THEN 'TEN'
    WHEN p.opponent_team_id = 'WAS' THEN 'WAS'
    ELSE UPPER(SUBSTRING(p.opponent_team_id, 1, 3))
  END as opponent_abbr,
  
  -- Team logos (placeholder for now)
  'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.team_id) || '.png' as team_logo,
  'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.opponent_team_id) || '.png' as opponent_logo,
  
  -- Streaks (simplified - will be calculated in the worker)
  '0/5' as last5_streak,
  '0/10' as last10_streak,
  '0/20' as last20_streak,
  '0/0' as h2h_streak,
  
  -- EV% (placeholder - will be calculated in worker)
  0.0 as ev_percent,
  
  -- Additional fields
  p.line as over_odds,
  p.line as under_odds,
  'Unknown' as sportsbook,
  p.game_id,
  p.prop_date as date,
  p.league as sport
  
FROM player_props_api_view p
LEFT JOIN players pl ON pl.id = p.player_id
WHERE p.league IS NOT NULL
  AND p.prop_date IS NOT NULL
ORDER BY p.prop_date DESC, p.league, p.player_id, p.prop_type;

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
