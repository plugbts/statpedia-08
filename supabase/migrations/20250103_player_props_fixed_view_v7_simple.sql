-- Simple version of player_props_fixed view to test basic functionality
-- This version focuses on getting the core data working first

DROP VIEW IF EXISTS player_props_fixed CASCADE;

-- Create teams lookup table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  team_name TEXT PRIMARY KEY,
  abbreviation TEXT NOT NULL,
  logo_url TEXT,
  league TEXT NOT NULL
);

-- Insert basic team mappings
INSERT INTO teams (team_name, abbreviation, logo_url, league) VALUES
-- NFL Teams
('PHILADEL', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', 'nfl'),
('NEW', 'NY', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', 'nfl'),
('LOS', 'LA', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', 'nfl'),
('DENVER', 'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', 'nfl'),

-- MLB Teams  
('PHILADEL', 'PHI', 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png', 'mlb'),
('LOS', 'LA', 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png', 'mlb')
ON CONFLICT (team_name) DO NOTHING;

CREATE VIEW player_props_fixed AS
SELECT 
  -- Basic prop info from proplines
  p.id as prop_id,
  p.player_id,
  p.prop_type,
  p.line,
  p.odds,
  p.over_odds,
  p.under_odds,
  p.sportsbook,
  p.league,
  p.season,
  p.date_normalized as prop_date,
  p.game_id,
  
  -- Simple player name (use player_id for now)
  p.player_id as player_name,
  
  -- Simple team abbreviations (use raw team names for now)
  p.team as team_abbr,
  p.opponent as opponent_abbr,
  
  -- Simple team logos
  CASE 
    WHEN p.team IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/mlb/500/' || LOWER(p.team) || '.png'
    ELSE NULL
  END as team_logo,
  CASE 
    WHEN p.opponent IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/mlb/500/' || LOWER(p.opponent) || '.png'
    ELSE NULL
  END as opponent_logo,
  
  -- Simple streaks (placeholder for now)
  '0/5' as last5_streak,
  '0/10' as last10_streak,
  '0/20' as last20_streak,
  '0/0' as h2h_streak,
  
  -- Simple EV% calculation
  CASE 
    WHEN p.over_odds IS NULL OR p.over_odds = 0 THEN NULL
    WHEN p.over_odds > 0 THEN 
      ROUND((100.0 / (p.over_odds + 100)) * 100, 2)
    ELSE 
      ROUND((-p.over_odds::numeric / (-p.over_odds + 100)) * 100, 2)
  END as ev_percent,
  
  -- Additional fields for compatibility
  p.under_odds as under_odds_compat,
  'Consensus' as sportsbook_name,
  p.date_normalized as date,
  p.league as sport
  
FROM proplines p
WHERE p.league IS NOT NULL
  AND p.date_normalized IS NOT NULL
ORDER BY p.date_normalized DESC, p.league, p.player_id
LIMIT 2000;

-- Grant permissions
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;
GRANT SELECT ON teams TO authenticated;
GRANT SELECT ON teams TO anon;
