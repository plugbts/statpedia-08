-- Fix player_props_fixed view to use proplines table (which has enriched team data)
-- instead of player_props_api_view (which uses player_game_logs with null values)

DROP VIEW IF EXISTS player_props_fixed CASCADE;

CREATE VIEW player_props_fixed AS
SELECT 
  -- Basic prop info from proplines table
  p.id as prop_id,
  p.player_id,
  p.prop_type,
  p.line,
  p.odds,
  NULL as stat_value, -- Not available in proplines
  p.date as game_date,
  p.team,
  p.opponent,
  p.league,
  p.season,
  p.date as prop_date,
  
  -- Clean player name (format: remove underscores, numbers, proper case)
  CASE 
    WHEN p.player_name IS NOT NULL AND p.player_name != 'null' THEN
      INITCAP(REPLACE(REPLACE(p.player_name, '_', ' '), '  ', ' '))
    ELSE p.player_id
  END as player_name,
  
  -- Team abbreviations (already enriched in proplines)
  p.team as team_abbr,
  p.opponent as opponent_abbr,
  
  -- Team logos (ESPN URLs based on league)
  CASE 
    WHEN p.team IS NOT NULL AND p.team != 'UNK' AND p.team != 'FA' THEN 
      'https://a.espncdn.com/i/teamlogos/' || 
      CASE p.league
        WHEN 'nfl' THEN 'nfl'
        WHEN 'nba' THEN 'nba' 
        WHEN 'mlb' THEN 'mlb'
        WHEN 'nhl' THEN 'nhl'
        ELSE 'nfl'
      END || '/500/' || LOWER(p.team) || '.png'
    ELSE NULL
  END as team_logo,
  CASE 
    WHEN p.opponent IS NOT NULL AND p.opponent != 'UNK' AND p.opponent != 'FA' THEN 
      'https://a.espncdn.com/i/teamlogos/' || 
      CASE p.league
        WHEN 'nfl' THEN 'nfl'
        WHEN 'nba' THEN 'nba' 
        WHEN 'mlb' THEN 'mlb'
        WHEN 'nhl' THEN 'nhl'
        ELSE 'nfl'
      END || '/500/' || LOWER(p.opponent) || '.png'
    ELSE NULL
  END as opponent_logo,
  
  -- Odds (from proplines)
  p.over_odds,
  p.under_odds,
  
  -- Streaks (will be calculated in the worker)
  '0/5' as last5_streak,
  '0/10' as last10_streak,
  '0/20' as last20_streak,
  '0/0' as h2h_streak,
  
  -- EV% (will be calculated in worker)
  NULL as ev_percent,
  
  -- Additional fields for compatibility
  p.sportsbook as sportsbook_name,
  p.game_id,
  p.date as date,
  p.league as sport,
  
  -- Metadata
  p.created_at,
  p.updated_at
  
FROM proplines p
WHERE p.league IS NOT NULL
  AND p.date IS NOT NULL
  AND p.player_name IS NOT NULL
  AND p.player_name != 'null'
ORDER BY p.date DESC, p.league, p.player_id
LIMIT 2000;

-- Grant permissions
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;

-- Add RLS to the view
ALTER VIEW player_props_fixed SET (security_invoker = true);
