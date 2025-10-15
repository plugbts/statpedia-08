-- Data Ingestion Service for Canonical Mapping Tables
-- This service handles the ingestion of player props data while maintaining stable boundaries

-- 1. INGESTION LOGGING TABLE
-- Track ingestion success/failure rates
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingestion_batch_id TEXT NOT NULL,
  source TEXT NOT NULL, -- e.g., 'api', 'manual', 'bulk'
  total_records INTEGER NOT NULL,
  successful_records INTEGER NOT NULL,
  failed_records INTEGER NOT NULL,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed'))
);

-- 2. INGESTION ERRORS TABLE
-- Detailed error tracking for debugging
CREATE TABLE IF NOT EXISTS ingestion_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingestion_batch_id TEXT NOT NULL,
  error_type TEXT NOT NULL, -- e.g., 'player_not_found', 'team_not_found', 'invalid_odds'
  error_message TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. BULK UPSERT FUNCTION FOR PLAYER PROPS
-- Handles ingestion while maintaining referential integrity
CREATE OR REPLACE FUNCTION bulk_upsert_player_props(
  props_data JSONB,
  batch_id TEXT DEFAULT NULL
) RETURNS TABLE (
  total_processed INTEGER,
  successful INTEGER,
  failed INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  prop_record JSONB;
  game_id_val UUID;
  player_id_val UUID;
  sportsbook_id_val UUID;
  success_count INTEGER := 0;
  fail_count INTEGER := 0;
  error_messages TEXT[] := '{}';
  current_batch_id TEXT;
BEGIN
  -- Generate batch ID if not provided
  current_batch_id := COALESCE(batch_id, 'batch_' || EXTRACT(epoch FROM now())::TEXT);
  
  -- Log ingestion start
  INSERT INTO ingestion_logs (ingestion_batch_id, source, total_records, successful_records, failed_records, started_at, status)
  VALUES (current_batch_id, 'bulk_upsert', jsonb_array_length(props_data), 0, 0, now(), 'running');
  
  -- Process each prop record
  FOR prop_record IN SELECT * FROM jsonb_array_elements(props_data)
  LOOP
    BEGIN
      -- Resolve game
      SELECT id INTO game_id_val
      FROM games
      WHERE external_id = (prop_record->>'game_id')
        AND is_active = true
      LIMIT 1;
      
      IF game_id_val IS NULL THEN
        RAISE EXCEPTION 'Game not found: %', prop_record->>'game_id';
      END IF;
      
      -- Resolve player
      SELECT id INTO player_id_val
      FROM players
      WHERE external_id = (prop_record->>'player_id')
        AND is_active = true
      LIMIT 1;
      
      IF player_id_val IS NULL THEN
        RAISE EXCEPTION 'Player not found: %', prop_record->>'player_id';
      END IF;
      
      -- Resolve sportsbook
      SELECT id INTO sportsbook_id_val
      FROM sportsbooks
      WHERE LOWER(name) = LOWER(prop_record->>'sportsbook')
        AND is_active = true
      LIMIT 1;
      
      IF sportsbook_id_val IS NULL THEN
        RAISE EXCEPTION 'Sportsbook not found: %', prop_record->>'sportsbook';
      END IF;
      
      -- Insert/update player prop
      INSERT INTO player_props (
        game_id,
        player_id,
        sportsbook_id,
        market,
        line,
        odds,
        ev_percent
      ) VALUES (
        game_id_val,
        player_id_val,
        sportsbook_id_val,
        prop_record->>'market',
        (prop_record->>'line')::DECIMAL(10,2),
        (prop_record->>'odds')::INTEGER,
        (prop_record->>'ev_percent')::DECIMAL(5,2)
      )
      ON CONFLICT (game_id, player_id, sportsbook_id, market, line)
      DO UPDATE SET
        odds = EXCLUDED.odds,
        ev_percent = EXCLUDED.ev_percent,
        updated_at = now();
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      fail_count := fail_count + 1;
      error_messages := array_append(error_messages, SQLERRM);
      
      -- Log detailed error
      INSERT INTO ingestion_errors (ingestion_batch_id, error_type, error_message, raw_data)
      VALUES (current_batch_id, 'processing_error', SQLERRM, prop_record);
    END;
  END LOOP;
  
  -- Update ingestion log
  UPDATE ingestion_logs
  SET successful_records = success_count,
      failed_records = fail_count,
      completed_at = now(),
      status = CASE WHEN fail_count = 0 THEN 'completed' ELSE 'failed' END
  WHERE ingestion_batch_id = current_batch_id;
  
  -- Return results
  RETURN QUERY SELECT 
    jsonb_array_length(props_data)::INTEGER,
    success_count,
    fail_count,
    error_messages;
END;
$$ LANGUAGE plpgsql;

-- 4. PLAYER RESOLUTION FUNCTION
-- Handles player creation/updates during ingestion
CREATE OR REPLACE FUNCTION resolve_or_create_player(
  external_id_input TEXT,
  display_name_input TEXT,
  team_abbrev_input TEXT,
  league_input TEXT,
  position_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  player_id_val UUID;
  team_id_val UUID;
BEGIN
  -- First try to find existing player
  SELECT id INTO player_id_val
  FROM players
  WHERE external_id = external_id_input
    AND is_active = true
  LIMIT 1;
  
  -- If player exists, update if needed
  IF player_id_val IS NOT NULL THEN
    UPDATE players
    SET display_name = display_name_input,
        position = COALESCE(position_input, position),
        updated_at = now()
    WHERE id = player_id_val;
    
    RETURN player_id_val;
  END IF;
  
  -- Resolve team
  SELECT id INTO team_id_val
  FROM teams
  WHERE UPPER(abbreviation) = UPPER(team_abbrev_input)
    AND league = league_input
    AND is_active = true
  LIMIT 1;
  
  -- Create new player
  INSERT INTO players (external_id, display_name, team_id, league, position)
  VALUES (external_id_input, display_name_input, team_id_val, league_input, position_input)
  RETURNING id INTO player_id_val;
  
  RETURN player_id_val;
END;
$$ LANGUAGE plpgsql;

-- 5. TEAM RESOLUTION FUNCTION
-- Handles team creation/updates during ingestion
CREATE OR REPLACE FUNCTION resolve_or_create_team(
  team_abbrev_input TEXT,
  team_name_input TEXT,
  league_input TEXT,
  logo_url_input TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  team_id_val UUID;
BEGIN
  -- First try to find existing team
  SELECT id INTO team_id_val
  FROM teams
  WHERE UPPER(abbreviation) = UPPER(team_abbrev_input)
    AND league = league_input
    AND is_active = true
  LIMIT 1;
  
  -- If team exists, update if needed
  IF team_id_val IS NOT NULL THEN
    UPDATE teams
    SET name = team_name_input,
        logo_url = COALESCE(logo_url_input, logo_url),
        updated_at = now()
    WHERE id = team_id_val;
    
    RETURN team_id_val;
  END IF;
  
  -- Create new team
  INSERT INTO teams (league, name, abbreviation, logo_url)
  VALUES (league_input, team_name_input, team_abbrev_input, logo_url_input)
  RETURNING id INTO team_id_val;
  
  RETURN team_id_val;
END;
$$ LANGUAGE plpgsql;

-- 6. GAME RESOLUTION FUNCTION
-- Handles game creation/updates during ingestion
CREATE OR REPLACE FUNCTION resolve_or_create_game(
  external_id_input TEXT,
  home_team_abbrev_input TEXT,
  away_team_abbrev_input TEXT,
  league_input TEXT,
  game_date_input TIMESTAMP WITH TIME ZONE,
  season_input INTEGER,
  week_input INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  game_id_val UUID;
  home_team_id_val UUID;
  away_team_id_val UUID;
BEGIN
  -- First try to find existing game
  SELECT id INTO game_id_val
  FROM games
  WHERE external_id = external_id_input
    AND is_active = true
  LIMIT 1;
  
  -- If game exists, return it
  IF game_id_val IS NOT NULL THEN
    RETURN game_id_val;
  END IF;
  
  -- Resolve teams
  SELECT id INTO home_team_id_val
  FROM teams
  WHERE UPPER(abbreviation) = UPPER(home_team_abbrev_input)
    AND league = league_input
    AND is_active = true
  LIMIT 1;
  
  SELECT id INTO away_team_id_val
  FROM teams
  WHERE UPPER(abbreviation) = UPPER(away_team_abbrev_input)
    AND league = league_input
    AND is_active = true
  LIMIT 1;
  
  -- Create new game
  INSERT INTO games (external_id, home_team_id, away_team_id, league, game_date, season, week)
  VALUES (external_id_input, home_team_id_val, away_team_id_val, league_input, game_date_input, season_input, week_input)
  RETURNING id INTO game_id_val;
  
  RETURN game_id_val;
END;
$$ LANGUAGE plpgsql;

-- 7. INGESTION HEALTH CHECK FUNCTION
-- Provides real-time ingestion health monitoring
CREATE OR REPLACE FUNCTION get_ingestion_health_status()
RETURNS TABLE (
  status TEXT,
  message TEXT,
  details JSONB
) AS $$
DECLARE
  recent_logs RECORD;
  error_count INTEGER;
  success_rate DECIMAL(5,2);
BEGIN
  -- Get recent ingestion stats
  SELECT 
    COUNT(*) as total_batches,
    SUM(successful_records) as total_successful,
    SUM(failed_records) as total_failed,
    AVG(CASE WHEN total_records > 0 THEN (successful_records::DECIMAL / total_records) * 100 ELSE 0 END) as avg_success_rate
  INTO recent_logs
  FROM ingestion_logs
  WHERE started_at > NOW() - INTERVAL '24 hours';
  
  -- Count recent errors
  SELECT COUNT(*) INTO error_count
  FROM ingestion_errors
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
  -- Determine overall status
  IF recent_logs.total_batches = 0 THEN
    RETURN QUERY SELECT 'warning'::TEXT, 'No recent ingestion activity'::TEXT, 
      jsonb_build_object('batches', 0, 'errors', 0);
  ELSIF recent_logs.avg_success_rate < 90 THEN
    RETURN QUERY SELECT 'error'::TEXT, 'Low ingestion success rate'::TEXT,
      jsonb_build_object(
        'batches', recent_logs.total_batches,
        'success_rate', recent_logs.avg_success_rate,
        'errors', error_count
      );
  ELSIF error_count > 10 THEN
    RETURN QUERY SELECT 'warning'::TEXT, 'High error count'::TEXT,
      jsonb_build_object(
        'batches', recent_logs.total_batches,
        'success_rate', recent_logs.avg_success_rate,
        'errors', error_count
      );
  ELSE
    RETURN QUERY SELECT 'healthy'::TEXT, 'Ingestion running smoothly'::TEXT,
      jsonb_build_object(
        'batches', recent_logs.total_batches,
        'success_rate', recent_logs.avg_success_rate,
        'errors', error_count
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. GRANT PERMISSIONS
GRANT SELECT ON ingestion_logs TO authenticated;
GRANT SELECT ON ingestion_errors TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_upsert_player_props(JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_or_create_player(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_or_create_team(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_or_create_game(TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_ingestion_health_status() TO authenticated;

GRANT ALL ON ingestion_logs TO service_role;
GRANT ALL ON ingestion_errors TO service_role;

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_batch_id ON ingestion_logs(ingestion_batch_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_started_at ON ingestion_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_ingestion_errors_batch_id ON ingestion_errors(ingestion_batch_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_errors_created_at ON ingestion_errors(created_at);

-- 10. ENABLE RLS
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read access for authenticated users" ON ingestion_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON ingestion_errors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access" ON ingestion_logs
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access" ON ingestion_errors
  FOR ALL TO service_role USING (true);
