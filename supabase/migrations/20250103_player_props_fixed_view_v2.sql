-- Fix player_props_fixed view to include all props, not just those with player names
-- The issue was that the LEFT JOIN with players table was filtering out props

DROP VIEW IF EXISTS player_props_fixed CASCADE;

CREATE VIEW player_props_fixed AS
SELECT 
  -- Basic prop info (from existing view)
  p.prop_id,
  p.player_id,
  p.prop_type,
  p.line,
  p.odds,
  p.stat_value,
  p.game_date,
  p.team,
  p.opponent,
  p.league,
  p.season,
  p.prop_date,
  
  -- Clean player name (use player_id if no full_name available)
  p.player_id as player_name,
  
  -- Team abbreviations (use existing team as abbreviation)
  p.team as team_abbr,
  p.opponent as opponent_abbr,
  
  -- Team logos (simple ESPN URLs)
  CASE 
    WHEN p.team IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.team) || '.png'
    ELSE NULL
  END as team_logo,
  CASE 
    WHEN p.opponent IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.opponent) || '.png'
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
WHERE p.league IS NOT NULL
  AND p.prop_date IS NOT NULL
ORDER BY p.prop_date DESC, p.league, p.player_id
LIMIT 2000;

-- Grant permissions
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;
