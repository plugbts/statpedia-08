-- Golden Dataset and Test Harness for Regression Safety
-- This ensures that core functionality remains stable as we make changes

-- 1. GOLDEN DATASET TABLE
-- Store known-good props for testing
CREATE TABLE IF NOT EXISTS golden_dataset (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL UNIQUE,
  description TEXT,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  opponent_abbrev TEXT NOT NULL,
  market TEXT NOT NULL,
  expected_line DECIMAL(10,2),
  expected_odds INTEGER,
  league TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert golden dataset examples
INSERT INTO golden_dataset (test_name, description, player_name, team_abbrev, opponent_abbrev, market, expected_line, expected_odds, league) VALUES
('joe_burrow_passing_yards', 'Joe Burrow passing yards prop', 'Joe Burrow', 'CIN', 'BAL', 'Passing Yards', 250.5, -110, 'nfl'),
('jamarr_chase_receiving_yards', 'Ja''Marr Chase receiving yards prop', 'Ja''Marr Chase', 'CIN', 'BAL', 'Receiving Yards', 75.5, -110, 'nfl'),
('aaron_rodgers_passing_tds', 'Aaron Rodgers passing touchdowns', 'Aaron Rodgers', 'NYJ', 'BUF', 'Passing Touchdowns', 1.5, -110, 'nfl'),
('josh_allen_rushing_yards', 'Josh Allen rushing yards', 'Josh Allen', 'BUF', 'NYJ', 'Rushing Yards', 45.5, -110, 'nfl'),
('travis_kelce_receptions', 'Travis Kelce receptions', 'Travis Kelce', 'KC', 'DEN', 'Receptions', 6.5, -110, 'nfl')
ON CONFLICT (test_name) DO NOTHING;

-- 2. TEST RESULTS TABLE
-- Store test execution results
CREATE TABLE IF NOT EXISTS test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_status TEXT NOT NULL CHECK (test_status IN ('passed', 'failed', 'error')),
  error_message TEXT,
  execution_time_ms INTEGER,
  props_found INTEGER DEFAULT 0,
  props_missing INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. TEST FUNCTIONS
-- Function to run golden dataset tests
CREATE OR REPLACE FUNCTION run_golden_dataset_tests()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  error_message TEXT,
  props_found INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  test_record RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  props_count INTEGER;
  error_msg TEXT;
  test_status TEXT;
BEGIN
  -- Loop through each golden dataset test
  FOR test_record IN 
    SELECT * FROM golden_dataset WHERE is_active = true
  LOOP
    start_time := clock_timestamp();
    error_msg := NULL;
    test_status := 'passed';
    
    BEGIN
      -- Test 1: Player name resolution
      SELECT COUNT(*) INTO props_count
      FROM player_props_normalized pn
      WHERE LOWER(pn.player_name) = LOWER(test_record.player_name)
        AND pn.team_abbrev = test_record.team_abbrev
        AND pn.market = test_record.market
        AND pn.sport = test_record.league;
      
      -- Test 2: Team logo resolution
      IF props_count > 0 THEN
        SELECT COUNT(*) INTO props_count
        FROM player_props_normalized pn
        WHERE LOWER(pn.player_name) = LOWER(test_record.player_name)
          AND pn.team_abbrev = test_record.team_abbrev
          AND pn.market = test_record.market
          AND pn.sport = test_record.league
          AND pn.team_logo IS NOT NULL
          AND pn.opponent_logo IS NOT NULL;
      END IF;
      
      -- Test 3: Odds are numeric
      IF props_count > 0 THEN
        SELECT COUNT(*) INTO props_count
        FROM player_props_normalized pn
        WHERE LOWER(pn.player_name) = LOWER(test_record.player_name)
          AND pn.team_abbrev = test_record.team_abbrev
          AND pn.market = test_record.market
          AND pn.sport = test_record.league
          AND pn.odds IS NOT NULL
          AND pn.odds != 0;
      END IF;
      
      -- Determine test status
      IF props_count = 0 THEN
        test_status := 'failed';
        error_msg := 'No props found for ' || test_record.player_name || ' ' || test_record.market;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      test_status := 'error';
      error_msg := SQLERRM;
      props_count := 0;
    END;
    
    end_time := clock_timestamp();
    
    -- Insert test result
    INSERT INTO test_results (test_name, test_status, error_message, execution_time_ms, props_found)
    VALUES (
      test_record.test_name,
      test_status,
      error_msg,
      EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER,
      props_count
    );
    
    -- Return result
    RETURN QUERY SELECT 
      test_record.test_name,
      test_status,
      error_msg,
      props_count,
      EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER;
      
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check ingestion health
CREATE OR REPLACE FUNCTION check_ingestion_health()
RETURNS TABLE (
  metric_name TEXT,
  metric_value INTEGER,
  status TEXT
) AS $$
BEGIN
  -- Total props count
  RETURN QUERY SELECT 
    'total_props'::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END
  FROM player_props_normalized;
  
  -- Props with missing player names
  RETURN QUERY SELECT 
    'props_missing_player_names'::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) = 0 THEN 'healthy' ELSE 'warning' END
  FROM player_props_normalized 
  WHERE player_name IS NULL OR player_name = 'Unknown Player';
  
  -- Props with missing team logos
  RETURN QUERY SELECT 
    'props_missing_team_logos'::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) = 0 THEN 'healthy' ELSE 'warning' END
  FROM player_props_normalized 
  WHERE team_logo IS NULL;
  
  -- Props with missing odds
  RETURN QUERY SELECT 
    'props_missing_odds'::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) = 0 THEN 'healthy' ELSE 'warning' END
  FROM player_props_normalized 
  WHERE odds IS NULL OR odds = 0;
  
  -- Recent props (last 24 hours)
  RETURN QUERY SELECT 
    'recent_props_24h'::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END
  FROM player_props_normalized 
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
END;
$$ LANGUAGE plpgsql;

-- Function to get ingestion summary
CREATE OR REPLACE FUNCTION get_ingestion_summary()
RETURNS TABLE (
  total_props INTEGER,
  resolved_players INTEGER,
  failed_players INTEGER,
  total_teams INTEGER,
  total_sportsbooks INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY SELECT 
    (SELECT COUNT(*)::INTEGER FROM player_props_normalized),
    (SELECT COUNT(DISTINCT player_id)::INTEGER FROM player_props_normalized),
    (SELECT COUNT(*)::INTEGER FROM player_props WHERE player_id IS NULL),
    (SELECT COUNT(*)::INTEGER FROM teams WHERE is_active = true),
    (SELECT COUNT(*)::INTEGER FROM sportsbooks WHERE is_active = true),
    (SELECT MAX(updated_at) FROM player_props_normalized);
END;
$$ LANGUAGE plpgsql;

-- 4. GRANT PERMISSIONS
GRANT SELECT ON golden_dataset TO authenticated;
GRANT SELECT ON test_results TO authenticated;
GRANT EXECUTE ON FUNCTION run_golden_dataset_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION check_ingestion_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ingestion_summary() TO authenticated;

GRANT ALL ON golden_dataset TO service_role;
GRANT ALL ON test_results TO service_role;
GRANT EXECUTE ON FUNCTION run_golden_dataset_tests() TO service_role;
GRANT EXECUTE ON FUNCTION check_ingestion_health() TO service_role;
GRANT EXECUTE ON FUNCTION get_ingestion_summary() TO service_role;

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_test_results_test_name ON test_results(test_name);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_golden_dataset_active ON golden_dataset(is_active);

-- 6. ENABLE RLS
ALTER TABLE golden_dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access for authenticated users" ON golden_dataset
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON test_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access" ON golden_dataset
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON test_results
  FOR ALL TO service_role USING (true);
