-- Create a fallback view that works with just proplines when game logs are missing
DROP VIEW IF EXISTS player_props_api_view CASCADE;

CREATE VIEW player_props_api_view AS
SELECT 
  p.id as prop_id,
  p.player_id,
  p.game_id,
  lower(p.league) as league,
  p.season,
  p.date_normalized as prop_date,
  normalize_prop_type(p.prop_type) as prop_type,
  p.line,
  p.odds,
  COALESCE(g.id, p.id) as game_log_id,
  COALESCE(g.value, p.line) as stat_value,
  COALESCE(g.date, p.date_normalized) as game_date,
  COALESCE(g.team, p.team) as team,
  COALESCE(g.opponent, p.opponent) as opponent
FROM proplines p
LEFT JOIN player_game_logs g ON 
  g.player_id = p.player_id 
  AND g.season = p.season 
  AND lower(g.sport) = lower(p.league)
  AND g.date BETWEEN (p.date_normalized - interval '1 day') AND (p.date_normalized + interval '1 day')
  AND normalize_prop_type(g.prop_type) = normalize_prop_type(p.prop_type);

-- Also update the player_props_fixed view
DROP VIEW IF EXISTS player_props_fixed CASCADE;

CREATE VIEW player_props_fixed AS
SELECT 
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
  
  COALESCE(pl.full_name, p.player_id) as player_name,
  p.team as team_abbr,
  p.opponent as opponent_abbr,
  
  CASE 
    WHEN p.team IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.team) || '.png'
    ELSE NULL
  END as team_logo,
  CASE 
    WHEN p.opponent IS NOT NULL THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || LOWER(p.opponent) || '.png'
    ELSE NULL
  END as opponent_logo,
  
  '0/5' as last5_streak,
  '0/10' as last10_streak,
  '0/20' as last20_streak,
  '0/0' as h2h_streak,
  
  0.0 as ev_percent,
  
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

GRANT SELECT ON player_props_api_view TO authenticated;
GRANT SELECT ON player_props_api_view TO anon;
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;
