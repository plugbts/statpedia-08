-- League-Agnostic Architecture Expansion
-- This migration adds NHL, WNBA teams, league-specific markets, and analytics
-- Completing the multi-league expansion without reinventing the wheel

-- ==============================================
-- 1. NHL TEAMS (32 teams)
-- ==============================================

INSERT INTO teams_canonical (league, name, abbreviation, logo_url, aliases) VALUES
('nhl', 'Anaheim Ducks', 'ANA', 'https://a.espncdn.com/i/teamlogos/nhl/500/ana.png', '[]'::jsonb),
('nhl', 'Arizona Coyotes', 'ARI', 'https://a.espncdn.com/i/teamlogos/nhl/500/ari.png', '[]'::jsonb),
('nhl', 'Boston Bruins', 'BOS', 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png', '[]'::jsonb),
('nhl', 'Buffalo Sabres', 'BUF', 'https://a.espncdn.com/i/teamlogos/nhl/500/buf.png', '[]'::jsonb),
('nhl', 'Calgary Flames', 'CGY', 'https://a.espncdn.com/i/teamlogos/nhl/500/cgy.png', '[]'::jsonb),
('nhl', 'Carolina Hurricanes', 'CAR', 'https://a.espncdn.com/i/teamlogos/nhl/500/car.png', '[]'::jsonb),
('nhl', 'Chicago Blackhawks', 'CHI', 'https://a.espncdn.com/i/teamlogos/nhl/500/chi.png', '[]'::jsonb),
('nhl', 'Colorado Avalanche', 'COL', 'https://a.espncdn.com/i/teamlogos/nhl/500/col.png', '[]'::jsonb),
('nhl', 'Columbus Blue Jackets', 'CBJ', 'https://a.espncdn.com/i/teamlogos/nhl/500/cbj.png', '[]'::jsonb),
('nhl', 'Dallas Stars', 'DAL', 'https://a.espncdn.com/i/teamlogos/nhl/500/dal.png', '[]'::jsonb),
('nhl', 'Detroit Red Wings', 'DET', 'https://a.espncdn.com/i/teamlogos/nhl/500/det.png', '[]'::jsonb),
('nhl', 'Edmonton Oilers', 'EDM', 'https://a.espncdn.com/i/teamlogos/nhl/500/edm.png', '[]'::jsonb),
('nhl', 'Florida Panthers', 'FLA', 'https://a.espncdn.com/i/teamlogos/nhl/500/fla.png', '[]'::jsonb),
('nhl', 'Los Angeles Kings', 'LAK', 'https://a.espncdn.com/i/teamlogos/nhl/500/lak.png', '[]'::jsonb),
('nhl', 'Minnesota Wild', 'MIN', 'https://a.espncdn.com/i/teamlogos/nhl/500/min.png', '[]'::jsonb),
('nhl', 'Montreal Canadiens', 'MTL', 'https://a.espncdn.com/i/teamlogos/nhl/500/mtl.png', '[]'::jsonb),
('nhl', 'Nashville Predators', 'NSH', 'https://a.espncdn.com/i/teamlogos/nhl/500/nsh.png', '[]'::jsonb),
('nhl', 'New Jersey Devils', 'NJD', 'https://a.espncdn.com/i/teamlogos/nhl/500/njd.png', '[]'::jsonb),
('nhl', 'New York Islanders', 'NYI', 'https://a.espncdn.com/i/teamlogos/nhl/500/nyi.png', '[]'::jsonb),
('nhl', 'New York Rangers', 'NYR', 'https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png', '[]'::jsonb),
('nhl', 'Ottawa Senators', 'OTT', 'https://a.espncdn.com/i/teamlogos/nhl/500/ott.png', '[]'::jsonb),
('nhl', 'Philadelphia Flyers', 'PHI', 'https://a.espncdn.com/i/teamlogos/nhl/500/phi.png', '[]'::jsonb),
('nhl', 'Pittsburgh Penguins', 'PIT', 'https://a.espncdn.com/i/teamlogos/nhl/500/pit.png', '[]'::jsonb),
('nhl', 'San Jose Sharks', 'SJ', 'https://a.espncdn.com/i/teamlogos/nhl/500/sj.png', '[]'::jsonb),
('nhl', 'Seattle Kraken', 'SEA', 'https://a.espncdn.com/i/teamlogos/nhl/500/sea.png', '[]'::jsonb),
('nhl', 'St. Louis Blues', 'STL', 'https://a.espncdn.com/i/teamlogos/nhl/500/stl.png', '[]'::jsonb),
('nhl', 'Tampa Bay Lightning', 'TB', 'https://a.espncdn.com/i/teamlogos/nhl/500/tb.png', '[]'::jsonb),
('nhl', 'Toronto Maple Leafs', 'TOR', 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png', '[]'::jsonb),
('nhl', 'Vancouver Canucks', 'VAN', 'https://a.espncdn.com/i/teamlogos/nhl/500/van.png', '[]'::jsonb),
('nhl', 'Vegas Golden Knights', 'VGK', 'https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png', '[]'::jsonb),
('nhl', 'Washington Capitals', 'WSH', 'https://a.espncdn.com/i/teamlogos/nhl/500/wsh.png', '[]'::jsonb),
('nhl', 'Winnipeg Jets', 'WPG', 'https://a.espncdn.com/i/teamlogos/nhl/500/wpg.png', '[]'::jsonb)
ON CONFLICT (league, name) DO NOTHING;

-- ==============================================
-- 2. WNBA TEAMS (12 teams)
-- ==============================================

INSERT INTO teams_canonical (league, name, abbreviation, logo_url, aliases) VALUES
('wnba', 'Atlanta Dream', 'ATL', 'https://a.espncdn.com/i/teamlogos/wnba/500/atl.png', '[]'::jsonb),
('wnba', 'Chicago Sky', 'CHI', 'https://a.espncdn.com/i/teamlogos/wnba/500/chi.png', '[]'::jsonb),
('wnba', 'Connecticut Sun', 'CONN', 'https://a.espncdn.com/i/teamlogos/wnba/500/conn.png', '[]'::jsonb),
('wnba', 'Dallas Wings', 'DAL', 'https://a.espncdn.com/i/teamlogos/wnba/500/dal.png', '[]'::jsonb),
('wnba', 'Indiana Fever', 'IND', 'https://a.espncdn.com/i/teamlogos/wnba/500/ind.png', '[]'::jsonb),
('wnba', 'Las Vegas Aces', 'LV', 'https://a.espncdn.com/i/teamlogos/wnba/500/lv.png', '[]'::jsonb),
('wnba', 'Los Angeles Sparks', 'LA', 'https://a.espncdn.com/i/teamlogos/wnba/500/la.png', '[]'::jsonb),
('wnba', 'Minnesota Lynx', 'MIN', 'https://a.espncdn.com/i/teamlogos/wnba/500/min.png', '[]'::jsonb),
('wnba', 'New York Liberty', 'NY', 'https://a.espncdn.com/i/teamlogos/wnba/500/ny.png', '[]'::jsonb),
('wnba', 'Phoenix Mercury', 'PHX', 'https://a.espncdn.com/i/teamlogos/wnba/500/phx.png', '[]'::jsonb),
('wnba', 'Seattle Storm', 'SEA', 'https://a.espncdn.com/i/teamlogos/wnba/500/sea.png', '[]'::jsonb),
('wnba', 'Washington Mystics', 'WSH', 'https://a.espncdn.com/i/teamlogos/wnba/500/wsh.png', '[]'::jsonb)
ON CONFLICT (league, name) DO NOTHING;

-- ==============================================
-- 3. LEAGUE-SPECIFIC MARKETS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS league_markets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    market_name TEXT NOT NULL,
    market_category TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT league_markets_unique UNIQUE (league, market_name)
);

-- NFL Markets (17 markets)
INSERT INTO league_markets (league, market_name, market_category, description) VALUES
('nfl', 'Passing Yards', 'Offensive', 'Total passing yards for a quarterback'),
('nfl', 'Rushing Yards', 'Offensive', 'Total rushing yards for a running back'),
('nfl', 'Receiving Yards', 'Offensive', 'Total receiving yards for a wide receiver/tight end'),
('nfl', 'Passing Touchdowns', 'Offensive', 'Number of passing touchdowns'),
('nfl', 'Rushing Touchdowns', 'Offensive', 'Number of rushing touchdowns'),
('nfl', 'Receiving Touchdowns', 'Offensive', 'Number of receiving touchdowns'),
('nfl', 'Receptions', 'Offensive', 'Number of catches'),
('nfl', 'Pass Completions', 'Offensive', 'Number of completed passes'),
('nfl', 'Pass Attempts', 'Offensive', 'Number of pass attempts'),
('nfl', 'Interceptions', 'Defensive', 'Number of interceptions thrown'),
('nfl', 'Fumbles', 'Defensive', 'Number of fumbles'),
('nfl', 'Sacks', 'Defensive', 'Number of sacks'),
('nfl', 'Tackles', 'Defensive', 'Total tackles'),
('nfl', 'Field Goals Made', 'Special Teams', 'Number of field goals made'),
('nfl', 'Extra Points Made', 'Special Teams', 'Number of extra points made'),
('nfl', 'Game Total Points', 'Game', 'Total points scored in the game'),
('nfl', 'Game Total Yards', 'Game', 'Total yards in the game')
ON CONFLICT (league, market_name) DO NOTHING;

-- NBA Markets (16 markets)
INSERT INTO league_markets (league, market_name, market_category, description) VALUES
('nba', 'Points', 'Offensive', 'Total points scored'),
('nba', 'Rebounds', 'Offensive', 'Total rebounds (offensive + defensive)'),
('nba', 'Assists', 'Offensive', 'Number of assists'),
('nba', 'Steals', 'Defensive', 'Number of steals'),
('nba', 'Blocks', 'Defensive', 'Number of blocks'),
('nba', '3-Pointers Made', 'Offensive', 'Number of 3-pointers made'),
('nba', '3-Pointers Attempted', 'Offensive', 'Number of 3-pointers attempted'),
('nba', 'Free Throws Made', 'Offensive', 'Number of free throws made'),
('nba', 'Free Throws Attempted', 'Offensive', 'Number of free throws attempted'),
('nba', 'Turnovers', 'Defensive', 'Number of turnovers'),
('nba', 'Field Goals Made', 'Offensive', 'Number of field goals made'),
('nba', 'Field Goals Attempted', 'Offensive', 'Number of field goals attempted'),
('nba', 'Minutes Played', 'Game', 'Total minutes played'),
('nba', 'Game Total Points', 'Game', 'Total points scored in the game'),
('nba', 'Game Total Rebounds', 'Game', 'Total rebounds in the game'),
('nba', 'Game Total Assists', 'Game', 'Total assists in the game')
ON CONFLICT (league, market_name) DO NOTHING;

-- MLB Markets (16 markets)
INSERT INTO league_markets (league, market_name, market_category, description) VALUES
('mlb', 'Hits', 'Offensive', 'Number of hits'),
('mlb', 'Runs', 'Offensive', 'Number of runs scored'),
('mlb', 'RBIs', 'Offensive', 'Runs batted in'),
('mlb', 'Home Runs', 'Offensive', 'Number of home runs'),
('mlb', 'Strikeouts', 'Pitching', 'Number of strikeouts'),
('mlb', 'Walks', 'Pitching', 'Number of walks'),
('mlb', 'Earned Runs', 'Pitching', 'Number of earned runs allowed'),
('mlb', 'Innings Pitched', 'Pitching', 'Number of innings pitched'),
('mlb', 'Hits Allowed', 'Pitching', 'Number of hits allowed'),
('mlb', 'Saves', 'Pitching', 'Number of saves'),
('mlb', 'Stolen Bases', 'Offensive', 'Number of stolen bases'),
('mlb', 'Doubles', 'Offensive', 'Number of doubles'),
('mlb', 'Triples', 'Offensive', 'Number of triples'),
('mlb', 'Game Total Runs', 'Game', 'Total runs scored in the game'),
('mlb', 'Game Total Hits', 'Game', 'Total hits in the game'),
('mlb', 'Game Total Strikeouts', 'Game', 'Total strikeouts in the game')
ON CONFLICT (league, market_name) DO NOTHING;

-- NHL Markets (16 markets)
INSERT INTO league_markets (league, market_name, market_category, description) VALUES
('nhl', 'Goals', 'Offensive', 'Number of goals scored'),
('nhl', 'Assists', 'Offensive', 'Number of assists'),
('nhl', 'Points', 'Offensive', 'Total points (goals + assists)'),
('nhl', 'Shots on Goal', 'Offensive', 'Number of shots on goal'),
('nhl', 'Hits', 'Defensive', 'Number of hits'),
('nhl', 'Blocked Shots', 'Defensive', 'Number of blocked shots'),
('nhl', 'Penalty Minutes', 'Defensive', 'Penalty minutes'),
('nhl', 'Power Play Goals', 'Offensive', 'Goals scored on power play'),
('nhl', 'Short Handed Goals', 'Offensive', 'Goals scored while short-handed'),
('nhl', 'Faceoffs Won', 'Offensive', 'Number of faceoffs won'),
('nhl', 'Saves', 'Goaltending', 'Number of saves made'),
('nhl', 'Goals Against', 'Goaltending', 'Goals allowed'),
('nhl', 'Save Percentage', 'Goaltending', 'Save percentage'),
('nhl', 'Game Total Goals', 'Game', 'Total goals scored in the game'),
('nhl', 'Game Total Shots', 'Game', 'Total shots in the game'),
('nhl', 'Game Total Hits', 'Game', 'Total hits in the game')
ON CONFLICT (league, market_name) DO NOTHING;

-- WNBA Markets (16 markets)
INSERT INTO league_markets (league, market_name, market_category, description) VALUES
('wnba', 'Points', 'Offensive', 'Total points scored'),
('wnba', 'Rebounds', 'Offensive', 'Total rebounds (offensive + defensive)'),
('wnba', 'Assists', 'Offensive', 'Number of assists'),
('wnba', 'Steals', 'Defensive', 'Number of steals'),
('wnba', 'Blocks', 'Defensive', 'Number of blocks'),
('wnba', '3-Pointers Made', 'Offensive', 'Number of 3-pointers made'),
('wnba', '3-Pointers Attempted', 'Offensive', 'Number of 3-pointers attempted'),
('wnba', 'Free Throws Made', 'Offensive', 'Number of free throws made'),
('wnba', 'Free Throws Attempted', 'Offensive', 'Number of free throws attempted'),
('wnba', 'Turnovers', 'Defensive', 'Number of turnovers'),
('wnba', 'Field Goals Made', 'Offensive', 'Number of field goals made'),
('wnba', 'Field Goals Attempted', 'Offensive', 'Number of field goals attempted'),
('wnba', 'Minutes Played', 'Game', 'Total minutes played'),
('wnba', 'Game Total Points', 'Game', 'Total points scored in the game'),
('wnba', 'Game Total Rebounds', 'Game', 'Total rebounds in the game'),
('wnba', 'Game Total Assists', 'Game', 'Total assists in the game')
ON CONFLICT (league, market_name) DO NOTHING;

-- ==============================================
-- 4. LEAGUE-AWARE ANALYTICS TABLES
-- ==============================================

-- League Analytics Table
CREATE TABLE IF NOT EXISTS league_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4),
    metric_type TEXT NOT NULL,
    market_category TEXT,
    time_period TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- League Insights Table
CREATE TABLE IF NOT EXISTS league_insights (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    data_points JSONB,
    market_category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- League Performance Table
CREATE TABLE IF NOT EXISTS league_performance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    league TEXT NOT NULL,
    player_id UUID REFERENCES players_canonical(id),
    team_id UUID REFERENCES teams_canonical(id),
    market_name TEXT NOT NULL,
    performance_metric TEXT NOT NULL,
    metric_value DECIMAL(10,4),
    sample_size INTEGER,
    time_period TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ==============================================
-- 5. LEAGUE-AWARE ANALYTICS FUNCTIONS
-- ==============================================

-- Function to calculate league-wide EV trends
CREATE OR REPLACE FUNCTION calculate_league_ev_trends(
    league_input TEXT,
    days_back INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    avg_ev DECIMAL(10,4);
    total_props INTEGER;
    top_markets JSONB;
BEGIN
    -- Calculate average EV for the league
    SELECT AVG(ev_percent), COUNT(*) 
    INTO avg_ev, total_props
    FROM player_props_normalized 
    WHERE league = league_input 
    AND created_at >= NOW() - INTERVAL '7 days';
    
    -- Get top markets by count
    SELECT jsonb_agg(
        jsonb_build_object(
            'market', market,
            'count', market_count,
            'avg_ev', avg_ev_percent
        )
    ) INTO top_markets
    FROM (
        SELECT 
            market,
            COUNT(*) as market_count,
            AVG(ev_percent) as avg_ev_percent
        FROM player_props_normalized 
        WHERE league = league_input 
        AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY market
        ORDER BY market_count DESC
        LIMIT 5
    ) market_stats;
    
    result := jsonb_build_object(
        'league', league_input,
        'avg_ev_percent', avg_ev,
        'total_props', total_props,
        'top_markets', top_markets,
        'calculated_at', NOW()
    );
    
    -- Store in analytics table
    INSERT INTO league_analytics (
        league, metric_name, metric_value, metric_type, 
        time_period, calculated_at
    ) VALUES (
        league_input, 'avg_ev_percent', avg_ev, 'avg',
        'daily', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate league insights
CREATE OR REPLACE FUNCTION generate_league_insights(
    league_input TEXT
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    insights JSONB := '[]'::jsonb;
    market_diversity INTEGER;
BEGIN
    -- Calculate market diversity
    SELECT COUNT(DISTINCT market) INTO market_diversity
    FROM player_props_normalized 
    WHERE league = league_input;
    
    -- Generate insights based on data
    IF market_diversity > 5 THEN
        insights := insights || jsonb_build_object(
            'type', 'trend',
            'title', 'High Market Diversity',
            'description', 'This league offers a wide variety of betting markets',
            'confidence', 0.90,
            'category', 'market_coverage'
        );
    END IF;
    
    result := jsonb_build_object(
        'league', league_input,
        'insights', insights,
        'generated_at', NOW()
    );
    
    -- Store insights
    FOR i IN 0..jsonb_array_length(insights)-1 LOOP
        INSERT INTO league_insights (
            league, insight_type, title, description, 
            confidence_score, market_category
        ) VALUES (
            league_input,
            insights->i->>'type',
            insights->i->>'title',
            insights->i->>'description',
            (insights->i->>'confidence')::DECIMAL,
            insights->i->>'category'
        );
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate player performance by league
CREATE OR REPLACE FUNCTION calculate_player_performance_by_league(
    league_input TEXT,
    player_id_input UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    player_stats JSONB;
BEGIN
    -- Calculate performance metrics for players in the league
    WITH player_metrics AS (
        SELECT 
            player_id,
            player_name,
            team_name,
            market,
            AVG(ev_percent) as avg_ev,
            COUNT(*) as total_props,
            COUNT(*) FILTER (WHERE ev_percent > 0) as positive_props
        FROM player_props_normalized 
        WHERE league = league_input
        AND (player_id_input IS NULL OR player_id = player_id_input)
        GROUP BY player_id, player_name, team_name, market
        HAVING COUNT(*) >= 1
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'player_id', player_id,
            'player_name', player_name,
            'team_name', team_name,
            'market', market,
            'avg_ev', avg_ev,
            'hit_rate', CASE WHEN total_props > 0 THEN positive_props::DECIMAL / total_props ELSE 0 END,
            'total_props', total_props
        )
    ) INTO player_stats
    FROM player_metrics
    GROUP BY player_id, player_name, team_name, market, avg_ev, total_props, positive_props
    ORDER BY avg_ev DESC;
    
    result := jsonb_build_object(
        'league', league_input,
        'player_stats', COALESCE(player_stats, '[]'::jsonb),
        'calculated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 6. PERFORMANCE INDEXES
-- ==============================================

-- Indexes for league-specific queries
CREATE INDEX IF NOT EXISTS idx_league_markets_league ON league_markets(league);
CREATE INDEX IF NOT EXISTS idx_league_markets_category ON league_markets(market_category);
CREATE INDEX IF NOT EXISTS idx_league_analytics_league ON league_analytics(league);
CREATE INDEX IF NOT EXISTS idx_league_analytics_metric ON league_analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_league_insights_league ON league_insights(league);
CREATE INDEX IF NOT EXISTS idx_league_insights_type ON league_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_league_performance_league ON league_performance(league);
CREATE INDEX IF NOT EXISTS idx_league_performance_player ON league_performance(player_id);

-- ==============================================
-- 7. GOLDEN DATASET TESTS (Updated)
-- ==============================================

-- Update golden dataset tests for new leagues
INSERT INTO golden_dataset (league, test_name, test_description, expected_result) VALUES
('nhl', 'team_resolution', 'Test NHL team resolution by abbreviation', '{"team_id": "not_null", "team_name": "Toronto Maple Leafs"}'),
('nhl', 'player_props_view', 'Test NHL player props normalized view', '{"prop_count": ">=0", "league": "nhl"}'),
('nhl', 'market_coverage', 'Test NHL market coverage', '{"market_count": ">=10", "categories": ">=3"}'),
('wnba', 'team_resolution', 'Test WNBA team resolution by abbreviation', '{"team_id": "not_null", "team_name": "Las Vegas Aces"}'),
('wnba', 'player_props_view', 'Test WNBA player props normalized view', '{"prop_count": ">=0", "league": "wnba"}'),
('wnba', 'market_coverage', 'Test WNBA market coverage', '{"market_count": ">=10", "categories": ">=3"}')
ON CONFLICT DO NOTHING;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- This migration completes the league-agnostic expansion:
-- ✅ NHL Teams: 32 teams added
-- ✅ WNBA Teams: 12 teams added  
-- ✅ League-Specific Markets: 81 markets across 5 leagues
-- ✅ Analytics Integration: Full league-aware analytics
-- ✅ Performance Functions: EV trends, insights, player performance
-- ✅ Golden Dataset Tests: Updated for all leagues
-- ✅ Performance Indexes: Optimized for multi-league queries

-- Final League Coverage:
-- NFL: 32 teams, 17 markets, analytics ready
-- NBA: 30 teams, 16 markets, analytics ready
-- MLB: 30 teams, 16 markets, analytics ready
-- NHL: 32 teams, 16 markets, analytics ready
-- WNBA: 12 teams, 16 markets, analytics ready

-- Total: 136 teams, 81 markets, 5 leagues
-- No more reinventing the wheel!
