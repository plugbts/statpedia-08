-- Fix all issues in player_props_fixed view
-- 1. Player names: Use player_name from player_game_logs, not concatenated with prop_type
-- 2. Team abbreviations: Create proper team mapping
-- 3. Lines & odds: Always take from proplines, join logs only for streaks
-- 4. EV%: Guard against null/0 odds to prevent division by zero
-- 5. Streaks: Compare gl.value vs p.line correctly (FIXED: Use window functions instead of subqueries)
-- 6. FIXED: Remove duplicate over_odds column

DROP VIEW IF EXISTS player_props_fixed CASCADE;

-- Create teams lookup table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  team_name TEXT PRIMARY KEY,
  abbreviation TEXT NOT NULL,
  logo_url TEXT,
  league TEXT NOT NULL
);

-- Insert team mappings for all leagues
INSERT INTO teams (team_name, abbreviation, logo_url, league) VALUES
-- NFL Teams
('PHILADELPHIA', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', 'nfl'),
('NEW_YORK', 'NY', 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', 'nfl'),
('DENVER', 'DEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', 'nfl'),
('NEW_ORLEANS', 'NO', 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', 'nfl'),
('LOS_ANGELES', 'LA', 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', 'nfl'),
('SAN_FRANCISCO', 'SF', 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', 'nfl'),
('GREEN_BAY', 'GB', 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', 'nfl'),
('KANSAS_CITY', 'KC', 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', 'nfl'),
('LAS_VEGAS', 'LV', 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', 'nfl'),
('TAMPA_BAY', 'TB', 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', 'nfl'),
('NEW_ENGLAND', 'NE', 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', 'nfl'),
('JACKSONVILLE', 'JAX', 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', 'nfl'),
('CAROLINA', 'CAR', 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', 'nfl'),
('CLEVELAND', 'CLE', 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', 'nfl'),
('INDIANAPOLIS', 'IND', 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', 'nfl'),
('TENNESSEE', 'TEN', 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', 'nfl'),
('ARIZONA', 'ARI', 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', 'nfl'),
('ATLANTA', 'ATL', 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', 'nfl'),
('BALTIMORE', 'BAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', 'nfl'),
('BUFFALO', 'BUF', 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', 'nfl'),
('CHICAGO', 'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', 'nfl'),
('CINCINNATI', 'CIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', 'nfl'),
('DALLAS', 'DAL', 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', 'nfl'),
('DETROIT', 'DET', 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', 'nfl'),
('HOUSTON', 'HOU', 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', 'nfl'),
('MIAMI', 'MIA', 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', 'nfl'),
('MINNESOTA', 'MIN', 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', 'nfl'),
('PITTSBURGH', 'PIT', 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', 'nfl'),
('SEATTLE', 'SEA', 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', 'nfl'),
('WASHINGTON', 'WAS', 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', 'nfl'),

-- NBA Teams
('LOS_ANGELES_LAKERS', 'LAL', 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', 'nba'),
('BOSTON_CELTICS', 'BOS', 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', 'nba'),
('GOLDEN_STATE_WARRIORS', 'GSW', 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png', 'nba'),
('CHICAGO_BULLS', 'CHI', 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', 'nba'),
('MIAMI_HEAT', 'MIA', 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', 'nba'),
('PHOENIX_SUNS', 'PHX', 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', 'nba'),
('DENVER_NUGGETS', 'DEN', 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', 'nba'),
('MILWAUKEE_BUCKS', 'MIL', 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', 'nba'),

-- MLB Teams
('NEW_YORK_YANKEES', 'NYY', 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png', 'mlb'),
('LOS_ANGELES_DODGERS', 'LAD', 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png', 'mlb'),
('BOSTON_RED_SOX', 'BOS', 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png', 'mlb'),
('ATLANTA_BRAVES', 'ATL', 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png', 'mlb'),
('HOUSTON_ASTROS', 'HOU', 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png', 'mlb'),
('TAMPA_BAY_RAYS', 'TB', 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png', 'mlb'),
('TORONTO_BLUE_JAYS', 'TOR', 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png', 'mlb'),
('SEATTLE_MARINERS', 'SEA', 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png', 'mlb'),

-- NHL Teams
('BOSTON_BRUINS', 'BOS', 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png', 'nhl'),
('NEW_YORK_RANGERS', 'NYR', 'https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png', 'nhl'),
('TORONTO_MAPLE_LEAFS', 'TOR', 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png', 'nhl'),
('EDMONTON_OILERS', 'EDM', 'https://a.espncdn.com/i/teamlogos/nhl/500/edm.png', 'nhl'),
('VEGAS_GOLDEN_KNIGHTS', 'VGK', 'https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png', 'nhl'),
('FLORIDA_PANTHERS', 'FLA', 'https://a.espncdn.com/i/teamlogos/nhl/500/fla.png', 'nhl')
ON CONFLICT (team_name) DO NOTHING;

CREATE VIEW player_props_fixed AS
WITH streak_data AS (
  -- Calculate streaks using window functions
  SELECT 
    gl.player_id,
    gl.prop_type,
    gl.sport,
    gl.date,
    gl.value,
    gl.opponent,
    -- Rank recent games for each player/prop combination
    ROW_NUMBER() OVER (
      PARTITION BY gl.player_id, gl.prop_type, gl.sport 
      ORDER BY gl.date DESC
    ) as game_rank
  FROM player_game_logs gl
  WHERE gl.date < CURRENT_DATE -- Only historical games
)
SELECT 
  -- Basic prop info from proplines (always use proplines for lines/odds)
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
  
  -- Player name: Use from player_game_logs if available, fallback to player_id
  COALESCE(gl.player_name, p.player_id) as player_name,
  
  -- Team abbreviations and logos: Use teams lookup table
  COALESCE(t1.abbreviation, p.team) as team_abbr,
  COALESCE(t2.abbreviation, p.opponent) as opponent_abbr,
  t1.logo_url as team_logo,
  t2.logo_url as opponent_logo,
  
  -- Streaks: Calculate from streak_data CTE (compare gl.value vs p.line)
  COALESCE(
    (
      SELECT COUNT(*)::text || '/5'
      FROM streak_data s5
      WHERE s5.player_id = p.player_id
        AND s5.prop_type = p.prop_type
        AND s5.sport = p.league
        AND s5.game_rank <= 5
        AND s5.value >= p.line
    ), '0/5'
  ) as last5_streak,
  
  COALESCE(
    (
      SELECT COUNT(*)::text || '/10'
      FROM streak_data s10
      WHERE s10.player_id = p.player_id
        AND s10.prop_type = p.prop_type
        AND s10.sport = p.league
        AND s10.game_rank <= 10
        AND s10.value >= p.line
    ), '0/10'
  ) as last10_streak,
  
  COALESCE(
    (
      SELECT COUNT(*)::text || '/20'
      FROM streak_data s20
      WHERE s20.player_id = p.player_id
        AND s20.prop_type = p.prop_type
        AND s20.sport = p.league
        AND s20.game_rank <= 20
        AND s20.value >= p.line
    ), '0/20'
  ) as last20_streak,
  
  -- H2H streak vs current opponent
  COALESCE(
    (
      SELECT COUNT(*)::text || '/' || GREATEST(COUNT(*), 1)::text
      FROM streak_data sh
      WHERE sh.player_id = p.player_id
        AND sh.prop_type = p.prop_type
        AND sh.sport = p.league
        AND sh.opponent = p.opponent
        AND sh.value >= p.line
    ), '0/0'
  ) as h2h_streak,
  
  -- EV% calculation with null/0 odds protection
  CASE 
    WHEN p.over_odds IS NULL OR p.over_odds = 0 THEN NULL
    WHEN p.over_odds > 0 THEN 
      ROUND(
        (100.0 / (p.over_odds + 100)) * 100, 2
      )
    ELSE 
      ROUND(
        (-p.over_odds::numeric / (-p.over_odds + 100)) * 100, 2
      )
  END as ev_percent,
  
  -- Additional fields for compatibility (removed duplicate over_odds)
  p.under_odds as under_odds_compat,
  'Consensus' as sportsbook_name,
  p.date_normalized as date,
  p.league as sport
  
FROM proplines p
-- Join to get player names from game logs
LEFT JOIN player_game_logs gl ON 
  gl.player_id = p.player_id 
  AND gl.prop_type = p.prop_type 
  AND gl.sport = p.league
  AND gl.date BETWEEN (p.date_normalized - interval '1 day') AND (p.date_normalized + interval '1 day')
-- Join to teams table for team abbreviations and logos
LEFT JOIN teams t1 ON t1.team_name = p.team AND t1.league = p.league
LEFT JOIN teams t2 ON t2.team_name = p.opponent AND t2.league = p.league
WHERE p.league IS NOT NULL
  AND p.date_normalized IS NOT NULL
ORDER BY p.date_normalized DESC, p.league, p.player_id
LIMIT 2000;

-- Grant permissions
GRANT SELECT ON player_props_fixed TO authenticated;
GRANT SELECT ON player_props_fixed TO anon;
GRANT SELECT ON teams TO authenticated;
GRANT SELECT ON teams TO anon;
