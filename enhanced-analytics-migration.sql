-- Enhanced Analytics Layer with Streak Detection and Defensive Rankings
-- This migration adds advanced analytics features to the existing system

-- 1. Create enhanced player prop analytics with streaks and defensive rankings
CREATE OR REPLACE VIEW enhanced_player_prop_analytics AS
WITH player_stats AS (
    SELECT 
        pgl.player_id,
        pgl.player_name,
        pgl.team,
        pgl.prop_type,
        pgl.league,
        pgl.season,
        COUNT(*) as total_games,
        AVG(CASE WHEN pgl.value >= p.line THEN 1.0 ELSE 0.0 END) as hit_rate,
        COUNT(CASE WHEN pgl.value >= p.line THEN 1 END) as hits,
        COUNT(CASE WHEN pgl.value < p.line THEN 1 END) as misses,
        -- Rolling windows for recent performance
        AVG(CASE WHEN pgl.value >= p.line THEN 1.0 ELSE 0.0 END) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '5 days') as l5_hit_rate,
        AVG(CASE WHEN pgl.value >= p.line THEN 1.0 ELSE 0.0 END) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '10 days') as l10_hit_rate,
        AVG(CASE WHEN pgl.value >= p.line THEN 1.0 ELSE 0.0 END) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '20 days') as l20_hit_rate,
        -- Counts for rolling windows
        COUNT(*) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '5 days') as l5_games,
        COUNT(*) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '10 days') as l10_games,
        COUNT(*) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '20 days') as l20_games
    FROM player_game_logs pgl
    JOIN proplines p ON pgl.player_id = p.player_id 
        AND pgl.date = p.date 
        AND pgl.prop_type = p.prop_type
        AND pgl.league = p.league
    WHERE pgl.date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY pgl.player_id, pgl.player_name, pgl.team, pgl.prop_type, pgl.league, pgl.season
),
-- Simplified streak calculation using basic window functions
current_streaks AS (
    SELECT 
        pgl.player_id,
        pgl.prop_type,
        pgl.league,
        CASE WHEN pgl.value >= p.line THEN 1 ELSE 0 END as hit,
        COUNT(*) as streak_length,
        1 as rn
    FROM player_game_logs pgl
    JOIN proplines p ON pgl.player_id = p.player_id 
        AND pgl.date = p.date 
        AND pgl.prop_type = p.prop_type
        AND pgl.league = p.league
    WHERE pgl.date >= CURRENT_DATE - INTERVAL '7 days'
        AND pgl.player_id IN (
            -- Only include players with recent games
            SELECT DISTINCT player_id 
            FROM player_game_logs 
            WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        )
    GROUP BY pgl.player_id, pgl.prop_type, pgl.league, 
             CASE WHEN pgl.value >= p.line THEN 1 ELSE 0 END
    HAVING COUNT(*) >= 2  -- Minimum streak length
),
-- Defensive rankings (league-wide percentiles)
defensive_rankings AS (
    SELECT 
        pgl.player_id,
        pgl.prop_type,
        pgl.league,
        AVG(CASE WHEN pgl.value >= p.line THEN 1.0 ELSE 0.0 END) as hit_rate,
        -- Calculate percentile rank within league and prop type
        PERCENT_RANK() OVER (
            PARTITION BY pgl.league, pgl.prop_type 
            ORDER BY AVG(CASE WHEN pgl.value >= p.line THEN 1.0 ELSE 0.0 END)
        ) as hit_rate_percentile,
        -- Defensive ranking (how hard it is to hit against this player/team)
        AVG(p.line) as avg_line,
        PERCENT_RANK() OVER (
            PARTITION BY pgl.league, pgl.prop_type 
            ORDER BY AVG(p.line) DESC
        ) as defensive_percentile
    FROM player_game_logs pgl
    JOIN proplines p ON pgl.player_id = p.player_id 
        AND pgl.date = p.date 
        AND pgl.prop_type = p.prop_type
        AND pgl.league = p.league
    WHERE pgl.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY pgl.player_id, pgl.prop_type, pgl.league
    HAVING COUNT(*) >= 5 -- Minimum 5 games for ranking
)
SELECT 
    ps.*,
    -- Streak information
    cs.streak_length as current_streak,
    CASE WHEN cs.hit = 1 THEN 'hit' ELSE 'miss' END as streak_type,
    -- Defensive rankings
    dr.hit_rate_percentile,
    dr.defensive_percentile,
    dr.avg_line,
    -- Performance categories
    CASE 
        WHEN ps.hit_rate >= 0.7 THEN 'Elite'
        WHEN ps.hit_rate >= 0.6 THEN 'Strong'
        WHEN ps.hit_rate >= 0.5 THEN 'Average'
        WHEN ps.hit_rate >= 0.4 THEN 'Below Average'
        ELSE 'Poor'
    END as performance_tier,
    -- Defensive difficulty
    CASE 
        WHEN dr.defensive_percentile >= 0.8 THEN 'Very Easy'
        WHEN dr.defensive_percentile >= 0.6 THEN 'Easy'
        WHEN dr.defensive_percentile >= 0.4 THEN 'Moderate'
        WHEN dr.defensive_percentile >= 0.2 THEN 'Hard'
        ELSE 'Very Hard'
    END as defensive_difficulty,
    -- Recent trend
    CASE 
        WHEN ps.l5_hit_rate > ps.l10_hit_rate AND ps.l10_hit_rate > ps.l20_hit_rate THEN 'Improving'
        WHEN ps.l5_hit_rate < ps.l10_hit_rate AND ps.l10_hit_rate < ps.l20_hit_rate THEN 'Declining'
        ELSE 'Stable'
    END as recent_trend
FROM player_stats ps
LEFT JOIN current_streaks cs ON ps.player_id = cs.player_id 
    AND ps.prop_type = cs.prop_type 
    AND ps.league = cs.league
    AND cs.rn = 1
LEFT JOIN defensive_rankings dr ON ps.player_id = dr.player_id 
    AND ps.prop_type = dr.prop_type 
    AND ps.league = dr.league;

-- 2. Create league-specific materialized views for performance
CREATE MATERIALIZED VIEW nfl_prop_analytics AS
SELECT * FROM enhanced_player_prop_analytics WHERE league = 'nfl';

CREATE MATERIALIZED VIEW mlb_prop_analytics AS
SELECT * FROM enhanced_player_prop_analytics WHERE league = 'mlb';

CREATE MATERIALIZED VIEW nba_prop_analytics AS
SELECT * FROM enhanced_player_prop_analytics WHERE league = 'nba';

CREATE MATERIALIZED VIEW nhl_prop_analytics AS
SELECT * FROM enhanced_player_prop_analytics WHERE league = 'nhl';

-- 3. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_player_game_logs_league_prop_date 
ON player_game_logs(league, prop_type, date);

CREATE INDEX IF NOT EXISTS idx_proplines_league_prop_date 
ON proplines(league, prop_type, date);

CREATE INDEX IF NOT EXISTS idx_enhanced_analytics_league_performance 
ON enhanced_player_prop_analytics(league, performance_tier, hit_rate);

-- 4. Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW nfl_prop_analytics;
    REFRESH MATERIALIZED VIEW mlb_prop_analytics;
    REFRESH MATERIALIZED VIEW nba_prop_analytics;
    REFRESH MATERIALIZED VIEW nhl_prop_analytics;
END;
$$ LANGUAGE plpgsql;

-- 5. Create incremental refresh function for recent data only
CREATE OR REPLACE FUNCTION incremental_analytics_refresh(days_back INTEGER DEFAULT 2)
RETURNS void AS $$
BEGIN
    -- Drop and recreate materialized views with recent data filter
    DROP MATERIALIZED VIEW IF EXISTS nfl_prop_analytics;
    DROP MATERIALIZED VIEW IF EXISTS mlb_prop_analytics;
    DROP MATERIALIZED VIEW IF EXISTS nba_prop_analytics;
    DROP MATERIALIZED VIEW IF EXISTS nhl_prop_analytics;
    
    -- Recreate with incremental data
    CREATE MATERIALIZED VIEW nfl_prop_analytics AS
    SELECT * FROM enhanced_player_prop_analytics 
    WHERE league = 'nfl' AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back;
    
    CREATE MATERIALIZED VIEW mlb_prop_analytics AS
    SELECT * FROM enhanced_player_prop_analytics 
    WHERE league = 'mlb' AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back;
    
    CREATE MATERIALIZED VIEW nba_prop_analytics AS
    SELECT * FROM enhanced_player_prop_analytics 
    WHERE league = 'nba' AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back;
    
    CREATE MATERIALIZED VIEW nhl_prop_analytics AS
    SELECT * FROM enhanced_player_prop_analytics 
    WHERE league = 'nhl' AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- 6. Create streak analysis view for advanced insights
CREATE OR REPLACE VIEW streak_analysis AS
SELECT 
    player_id,
    player_name,
    team,
    prop_type,
    league,
    current_streak,
    streak_type,
    hit_rate,
    performance_tier,
    recent_trend,
    -- Streak quality metrics
    CASE 
        WHEN streak_type = 'hit' AND current_streak >= 5 THEN 'Hot Streak'
        WHEN streak_type = 'miss' AND current_streak >= 5 THEN 'Cold Streak'
        WHEN current_streak >= 3 THEN 'Building Streak'
        ELSE 'No Significant Streak'
    END as streak_quality,
    -- Betting value indicators
    CASE 
        WHEN streak_type = 'hit' AND current_streak >= 3 AND hit_rate > 0.6 THEN 'Fade Candidate'
        WHEN streak_type = 'miss' AND current_streak >= 3 AND hit_rate > 0.5 THEN 'Buy Low Candidate'
        ELSE 'Neutral'
    END as betting_signal
FROM enhanced_player_prop_analytics
WHERE current_streak IS NOT NULL
ORDER BY current_streak DESC, hit_rate DESC;

-- 7. Create defensive matchup rankings
CREATE OR REPLACE VIEW defensive_matchup_rankings AS
SELECT 
    team,
    league,
    prop_type,
    COUNT(*) as games_played,
    AVG(hit_rate) as avg_hit_rate_allowed,
    defensive_percentile,
    defensive_difficulty,
    -- Team performance tiers
    CASE 
        WHEN defensive_percentile >= 0.8 THEN 'Elite Defense'
        WHEN defensive_percentile >= 0.6 THEN 'Strong Defense'
        WHEN defensive_percentile >= 0.4 THEN 'Average Defense'
        WHEN defensive_percentile >= 0.2 THEN 'Weak Defense'
        ELSE 'Poor Defense'
    END as defensive_tier,
    -- Best and worst matchups
    RANK() OVER (PARTITION BY league, prop_type ORDER BY defensive_percentile DESC) as defensive_rank
FROM enhanced_player_prop_analytics
GROUP BY team, league, prop_type, defensive_percentile, defensive_difficulty
HAVING COUNT(*) >= 3
ORDER BY league, prop_type, defensive_percentile DESC;

-- Grant permissions
GRANT SELECT ON enhanced_player_prop_analytics TO authenticated;
GRANT SELECT ON nfl_prop_analytics TO authenticated;
GRANT SELECT ON mlb_prop_analytics TO authenticated;
GRANT SELECT ON nba_prop_analytics TO authenticated;
GRANT SELECT ON nhl_prop_analytics TO authenticated;
GRANT SELECT ON streak_analysis TO authenticated;
GRANT SELECT ON defensive_matchup_rankings TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION incremental_analytics_refresh(INTEGER) TO authenticated;
