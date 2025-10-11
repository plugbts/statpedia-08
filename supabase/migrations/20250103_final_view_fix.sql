-- Final fix: Update player_props_fixed view to source from proplines table
-- This ensures enriched team data flows directly to the UI

DROP VIEW IF EXISTS player_props_fixed CASCADE;

CREATE VIEW player_props_fixed AS
SELECT 
  -- Core prop data from proplines (enriched)
  p.id as prop_id,
  p.player_id,
  p.player_name,
  p.prop_type,
  p.line,
  p.over_odds,
  p.under_odds,
  p.odds,
  p.team,
  p.opponent,
  p.league,
  p.season,
  p.game_id,
  p.date as prop_date,
  p.date as game_date,
  p.sportsbook,
  
  -- Clean player name formatting
  CASE 
    WHEN p.player_name IS NOT NULL AND p.player_name != 'null' THEN
      INITCAP(REPLACE(REPLACE(p.player_name, '_', ' '), '  ', ' '))
    ELSE p.player_id
  END as clean_player_name,
  
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
  
  -- Analytics fields (calculated in worker)
  '0/5' as last5_streak,
  '0/10' as last10_streak,
  '0/20' as last20_streak,
  '0/0' as h2h_streak,
  NULL as ev_percent,
  
  -- Additional compatibility fields
  p.sportsbook as sportsbook_name,
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
  AND p.team IS NOT NULL
  AND p.team != 'UNK'
  AND p.opponent IS NOT NULL
  AND p.opponent != 'UNK'
ORDER BY p.date DESC, p.league, p.player_id
LIMIT 2000;

-- Grant permissions
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;

-- Add RLS to the view
ALTER VIEW player_props_fixed SET (security_invoker = true);

-- Create index on proplines for better performance
CREATE INDEX IF NOT EXISTS idx_proplines_league_date ON proplines(league, date);
CREATE INDEX IF NOT EXISTS idx_proplines_player_team ON proplines(player_id, team);
