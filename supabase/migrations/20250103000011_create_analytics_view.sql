-- Create comprehensive analytics view for all leagues
-- Computes Hit Rate, H2H, L5, L10, L20, Matchup Rank across all supported leagues

-- First, ensure we have the necessary columns in our tables
-- Add any missing columns to proplines table
ALTER TABLE public.proplines 
ADD COLUMN IF NOT EXISTS opponent_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS home_away VARCHAR(4),
ADD COLUMN IF NOT EXISTS game_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS weather_conditions VARCHAR(64);

-- Add any missing columns to player_game_logs table  
ALTER TABLE public.player_game_logs
ADD COLUMN IF NOT EXISTS opponent_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS home_away VARCHAR(4),
ADD COLUMN IF NOT EXISTS game_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS weather_conditions VARCHAR(64);

-- Create comprehensive analytics view
CREATE OR REPLACE VIEW public.player_prop_analytics AS
WITH prop_game_data AS (
  -- Join props with game logs to get actual performance data
  SELECT 
    p.player_id,
    p.player_name,
    p.team,
    p.league,
    p.prop_type,
    p.date,
    p.line,
    p.odds,
    p.sportsbook,
    p.opponent_id,
    p.home_away,
    p.game_time,
    p.weather_conditions,
    g.value as actual_value,
    g.opponent as game_opponent,
    -- Calculate if prop hit (over the line)
    CASE WHEN g.value > p.line THEN 1 ELSE 0 END as hit,
    -- Calculate margin (how much over/under the line)
    g.value - p.line as margin,
    -- Row number for ordering by date
    ROW_NUMBER() OVER (PARTITION BY p.player_id, p.prop_type ORDER BY p.date DESC) as rn
  FROM public.proplines p
  LEFT JOIN public.player_game_logs g 
    ON g.player_id = p.player_id
   AND g.date = p.date
   AND g.prop_type = p.prop_type
   AND g.team = p.team
  WHERE p.created_at >= NOW() - INTERVAL '2 years' -- Last 2 years of data
),

analytics_calculations AS (
  SELECT 
    *,
    -- L5 Hit Rate (Last 5 games)
    AVG(hit) OVER (
      PARTITION BY player_id, prop_type 
      ORDER BY date DESC 
      ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
    ) as hit_rate_l5,
    
    -- L10 Hit Rate (Last 10 games)  
    AVG(hit) OVER (
      PARTITION BY player_id, prop_type 
      ORDER BY date DESC 
      ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
    ) as hit_rate_l10,
    
    -- L20 Hit Rate (Last 20 games)
    AVG(hit) OVER (
      PARTITION BY player_id, prop_type 
      ORDER BY date DESC 
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) as hit_rate_l20,
    
    -- Season Hit Rate (Current season)
    AVG(hit) OVER (
      PARTITION BY player_id, prop_type, EXTRACT(YEAR FROM date)
      ORDER BY date DESC
    ) as hit_rate_season,
    
    -- Head-to-Head Hit Rate vs specific opponent
    AVG(hit) FILTER (
      WHERE opponent_id = game_opponent OR opponent_id IS NOT NULL
    ) OVER (
      PARTITION BY player_id, prop_type, game_opponent
    ) as h2h_hit_rate,
    
    -- Current streak (consecutive hits/misses)
    SUM(hit) OVER (
      PARTITION BY player_id, prop_type
      ORDER BY date DESC
      ROWS UNBOUNDED PRECEDING
    ) - SUM(1-hit) OVER (
      PARTITION BY player_id, prop_type  
      ORDER BY date DESC
      ROWS UNBOUNDED PRECEDING
    ) as current_streak_raw,
    
    -- Average margin (how much over/under the line on average)
    AVG(margin) OVER (
      PARTITION BY player_id, prop_type
      ORDER BY date DESC
      ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
    ) as avg_margin_l10,
    
    -- Games played in timeframe
    COUNT(*) OVER (
      PARTITION BY player_id, prop_type
      ORDER BY date DESC
      ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
    ) as games_l10,
    
    COUNT(*) OVER (
      PARTITION BY player_id, prop_type
      ORDER BY date DESC
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW  
    ) as games_l20
    
  FROM prop_game_data
  WHERE actual_value IS NOT NULL -- Only include props with actual game data
),

matchup_rankings AS (
  -- Calculate opponent defensive rankings for matchup analysis
  SELECT 
    opponent_id,
    prop_type,
    league,
    AVG(actual_value) as avg_allowed,
    COUNT(*) as games_played,
    -- Rank opponents by how much they allow (higher = worse defense)
    NTILE(32) OVER (
      PARTITION BY prop_type, league 
      ORDER BY AVG(actual_value) DESC
    ) as defensive_rank
  FROM prop_game_data
  WHERE actual_value IS NOT NULL
  GROUP BY opponent_id, prop_type, league
)

SELECT 
  ac.player_id,
  ac.player_name,
  ac.team,
  ac.league,
  ac.prop_type,
  ac.date,
  ac.line,
  ac.odds,
  ac.sportsbook,
  ac.opponent_id,
  ac.home_away,
  ac.game_time,
  ac.weather_conditions,
  ac.actual_value,
  ac.hit,
  ac.margin,
  
  -- Hit Rates (as percentages)
  ROUND(COALESCE(ac.hit_rate_l5, 0) * 100, 1) as hit_rate_l5_pct,
  ROUND(COALESCE(ac.hit_rate_l10, 0) * 100, 1) as hit_rate_l10_pct,
  ROUND(COALESCE(ac.hit_rate_l20, 0) * 100, 1) as hit_rate_l20_pct,
  ROUND(COALESCE(ac.hit_rate_season, 0) * 100, 1) as hit_rate_season_pct,
  ROUND(COALESCE(ac.h2h_hit_rate, 0) * 100, 1) as h2h_hit_rate_pct,
  
  -- Game counts
  ac.games_l10,
  ac.games_l20,
  
  -- Streak information
  CASE 
    WHEN ac.current_streak_raw > 0 THEN 'Over'
    WHEN ac.current_streak_raw < 0 THEN 'Under'
    ELSE 'Even'
  END as streak_direction,
  ABS(ac.current_streak_raw) as current_streak_count,
  
  -- Margin analysis
  ROUND(COALESCE(ac.avg_margin_l10, 0), 2) as avg_margin_l10,
  
  -- Matchup rankings
  COALESCE(mr.defensive_rank, 16) as matchup_defensive_rank,
  COALESCE(mr.avg_allowed, 0) as opponent_avg_allowed,
  COALESCE(mr.games_played, 0) as opponent_games_played,
  
  -- Matchup rank display
  CASE 
    WHEN mr.defensive_rank <= 5 THEN 'Top 5'
    WHEN mr.defensive_rank <= 10 THEN 'Top 10'  
    WHEN mr.defensive_rank <= 15 THEN 'Top 15'
    WHEN mr.defensive_rank <= 20 THEN 'Top 20'
    WHEN mr.defensive_rank <= 25 THEN 'Bottom 10'
    ELSE 'Bottom 5'
  END as matchup_rank_display,
  
  -- Performance indicators
  CASE 
    WHEN ac.hit_rate_l10 > 0.6 THEN 'Hot'
    WHEN ac.hit_rate_l10 < 0.4 THEN 'Cold'
    ELSE 'Average'
  END as performance_trend,
  
  -- Value indicators (based on margin and hit rate)
  CASE
    WHEN ac.avg_margin_l10 > 0.5 AND ac.hit_rate_l10 > 0.55 THEN 'Strong Over'
    WHEN ac.avg_margin_l10 < -0.5 AND ac.hit_rate_l10 < 0.45 THEN 'Strong Under'
    WHEN ac.avg_margin_l10 > 0.2 AND ac.hit_rate_l10 > 0.5 THEN 'Over'
    WHEN ac.avg_margin_l10 < -0.2 AND ac.hit_rate_l10 < 0.5 THEN 'Under'
    ELSE 'Neutral'
  END as value_indicator

FROM analytics_calculations ac
LEFT JOIN matchup_rankings mr 
  ON mr.opponent_id = ac.opponent_id
 AND mr.prop_type = ac.prop_type  
 AND mr.league = ac.league
WHERE ac.rn = 1 -- Only get the most recent prop for each player/type combination
ORDER BY ac.date DESC, ac.hit_rate_l10 DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_player_prop ON public.player_prop_analytics (player_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_analytics_league ON public.player_prop_analytics (league);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.player_prop_analytics (date);
CREATE INDEX IF NOT EXISTS idx_analytics_hit_rate ON public.player_prop_analytics (hit_rate_l10_pct);

-- Grant permissions
GRANT SELECT ON public.player_prop_analytics TO authenticated;
GRANT SELECT ON public.player_prop_analytics TO anon;

-- Add helpful comments
COMMENT ON VIEW public.player_prop_analytics IS 'Comprehensive analytics view with hit rates, streaks, and matchup rankings for all leagues';
COMMENT ON COLUMN public.player_prop_analytics.hit_rate_l5_pct IS 'Hit rate percentage over last 5 games';
COMMENT ON COLUMN public.player_prop_analytics.hit_rate_l10_pct IS 'Hit rate percentage over last 10 games';
COMMENT ON COLUMN public.player_prop_analytics.hit_rate_l20_pct IS 'Hit rate percentage over last 20 games';
COMMENT ON COLUMN public.player_prop_analytics.h2h_hit_rate_pct IS 'Head-to-head hit rate vs specific opponent';
COMMENT ON COLUMN public.player_prop_analytics.matchup_defensive_rank IS 'Opponent defensive rank (1-32, lower = better defense)';
COMMENT ON COLUMN public.player_prop_analytics.performance_trend IS 'Performance trend: Hot/Cold/Average based on L10 hit rate';
COMMENT ON COLUMN public.player_prop_analytics.value_indicator IS 'Value indicator based on margin and hit rate analysis';
