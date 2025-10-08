-- Simplified Enhanced Analytics Layer (No Complex Window Functions)
-- This migration adds advanced analytics features without nested window functions

-- 1. Create enhanced player prop analytics with basic streak info
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
        COUNT(*) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '20 days') as l20_games,
        -- Recent performance indicators
        COUNT(CASE WHEN pgl.value >= p.line THEN 1 END) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '5 days') as l5_hits,
        COUNT(CASE WHEN pgl.value >= p.line THEN 1 END) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '10 days') as l10_hits
    FROM player_game_logs pgl
    JOIN proplines p ON pgl.player_id = p.player_id 
        AND pgl.date = p.date 
        AND pgl.prop_type = p.prop_type
        AND pgl.league = p.league
    WHERE pgl.date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY pgl.player_id, pgl.player_name, pgl.team, pgl.prop_type, pgl.league, pgl.season
),
-- Simple recent performance indicators (avoiding complex streak calculation)
recent_performance AS (
    SELECT 
        pgl.player_id,
        pgl.prop_type,
        pgl.league,
        -- Last 3 games performance
        COUNT(CASE WHEN pgl.value >= p.line THEN 1 END) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '3 days') as recent_hits,
        COUNT(*) FILTER (WHERE pgl.date >= CURRENT_DATE - INTERVAL '3 days') as recent_games,
        -- Last game result
        (SELECT CASE WHEN pgl2.value >= p2.line THEN 'hit' ELSE 'miss' END 
         FROM player_game_logs pgl2 
         JOIN proplines p2 ON pgl2.player_id = p2.player_id 
             AND pgl2.date = p2.date 
             AND pgl2.prop_type = p2.prop_type
             AND pgl2.league = p2.league
         WHERE pgl2.player_id = pgl.player_id 
             AND pgl2.prop_type = pgl.prop_type
             AND pgl2.league = pgl.league
         ORDER BY pgl2.date DESC 
         LIMIT 1) as last_result
    FROM player_game_logs pgl
    JOIN proplines p ON pgl.player_id = p.player_id 
        AND pgl.date = p.date 
        AND pgl.prop_type = p.prop_type
        AND pgl.league = p.league
    WHERE pgl.date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY pgl.player_id, pgl.prop_type, pgl.league
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
    -- Recent performance indicators
    rp.recent_hits,
    rp.recent_games,
    rp.last_result,
    CASE 
        WHEN rp.recent_games >= 3 AND rp.recent_hits >= 2 THEN 'Hot'
        WHEN rp.recent_games >= 3 AND rp.recent_hits <= 1 THEN 'Cold'
        WHEN rp.recent_games >= 2 AND rp.recent_hits = rp.recent_games THEN 'Perfect'
        WHEN rp.recent_games >= 2 AND rp.recent_hits = 0 THEN 'Struggling'
        ELSE 'Neutral'
    END as recent_form,
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
LEFT JOIN recent_performance rp ON ps.player_id = rp.player_id 
    AND ps.prop_type = rp.prop_type 
    AND ps.league = rp.league
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

-- 6. Create simplified performance analysis view
CREATE OR REPLACE VIEW performance_analysis AS
SELECT 
    player_id,
    player_name,
    team,
    prop_type,
    league,
    recent_form,
    last_result,
    recent_hits,
    recent_games,
    hit_rate,
    performance_tier,
    recent_trend,
    -- Performance indicators
    CASE 
        WHEN recent_form = 'Hot' AND hit_rate > 0.6 THEN 'Strong Buy'
        WHEN recent_form = 'Cold' AND hit_rate > 0.5 THEN 'Buy Low'
        WHEN recent_form = 'Perfect' AND recent_games >= 3 THEN 'Ride the Wave'
        WHEN recent_form = 'Struggling' AND hit_rate < 0.4 THEN 'Fade'
        ELSE 'Neutral'
    END as betting_signal,
    -- Form quality
    CASE 
        WHEN recent_form IN ('Hot', 'Perfect') THEN 'Positive'
        WHEN recent_form IN ('Cold', 'Struggling') THEN 'Negative'
        ELSE 'Neutral'
    END as form_quality
FROM enhanced_player_prop_analytics
WHERE recent_form IS NOT NULL
ORDER BY 
    CASE recent_form 
        WHEN 'Perfect' THEN 1
        WHEN 'Hot' THEN 2
        WHEN 'Neutral' THEN 3
        WHEN 'Cold' THEN 4
        WHEN 'Struggling' THEN 5
    END,
    hit_rate DESC;

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
GRANT SELECT ON performance_analysis TO authenticated;
GRANT SELECT ON defensive_matchup_rankings TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION incremental_analytics_refresh(INTEGER) TO authenticated;
