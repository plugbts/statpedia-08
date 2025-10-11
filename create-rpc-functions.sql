-- Create bulk upsert RPC functions to reduce Cloudflare Worker subrequest limit issues
-- Execute this directly in Supabase SQL editor

CREATE OR REPLACE FUNCTION bulk_upsert_proplines(rows jsonb)
RETURNS TABLE(
  inserted_count integer,
  updated_count integer,
  error_count integer,
  errors jsonb
) AS $$
DECLARE
  row_record jsonb;
  insert_count integer := 0;
  update_count integer := 0;
  error_count integer := 0;
  error_list jsonb := '[]'::jsonb;
  current_error jsonb;
BEGIN
  -- Process each row in the JSON array
  FOR row_record IN SELECT jsonb_array_elements(rows)
  LOOP
    BEGIN
      INSERT INTO proplines (
        player_id, 
        player_name, 
        team, 
        opponent, 
        league, 
        season, 
        game_id, 
        date_normalized,
        date,
        prop_type, 
        line, 
        over_odds, 
        under_odds, 
        odds,
        sportsbook,
        conflict_key
      )
      VALUES (
        (row_record->>'player_id')::text,
        (row_record->>'player_name')::text,
        (row_record->>'team')::text,
        (row_record->>'opponent')::text,
        (row_record->>'league')::text,
        (row_record->>'season')::integer,
        (row_record->>'game_id')::text,
        (row_record->>'date_normalized')::date,
        (row_record->>'date')::date,
        (row_record->>'prop_type')::text,
        (row_record->>'line')::numeric,
        (row_record->>'over_odds')::numeric,
        (row_record->>'under_odds')::numeric,
        (row_record->>'odds')::numeric,
        COALESCE((row_record->>'sportsbook')::text, 'SportsGameOdds'),
        (row_record->>'conflict_key')::text
      )
      ON CONFLICT (player_id, date, prop_type, sportsbook, line) 
      DO UPDATE SET
        player_name = EXCLUDED.player_name,
        team = EXCLUDED.team,
        opponent = EXCLUDED.opponent,
        line = EXCLUDED.line,
        over_odds = EXCLUDED.over_odds,
        under_odds = EXCLUDED.under_odds,
        odds = EXCLUDED.odds,
        conflict_key = EXCLUDED.conflict_key,
        updated_at = NOW();

      -- Check if this was an insert or update
      -- FOUND is automatically set by PostgreSQL after INSERT/UPDATE operations
      IF FOUND THEN
        -- Check if row existed before (this is an update)
        IF (SELECT COUNT(*) FROM proplines WHERE 
            player_id = (row_record->>'player_id')::text 
            AND date = (row_record->>'date')::date 
            AND prop_type = (row_record->>'prop_type')::text 
            AND sportsbook = COALESCE((row_record->>'sportsbook')::text, 'SportsGameOdds')
            AND line = (row_record->>'line')::numeric) > 0 THEN
          update_count := update_count + 1;
        ELSE
          insert_count := insert_count + 1;
        END IF;
      ELSE
        insert_count := insert_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      current_error := jsonb_build_object(
        'player_id', row_record->>'player_id',
        'error', SQLERRM,
        'row', row_record
      );
      error_list := error_list || current_error;
    END;
  END LOOP;

  RETURN QUERY SELECT insert_count, update_count, error_count, error_list;
END;
$$ LANGUAGE plpgsql;

-- Create similar function for player_game_logs
CREATE OR REPLACE FUNCTION bulk_upsert_player_game_logs(rows jsonb)
RETURNS TABLE(
  inserted_count integer,
  updated_count integer,
  error_count integer,
  errors jsonb
) AS $$
DECLARE
  row_record jsonb;
  insert_count integer := 0;
  update_count integer := 0;
  error_count integer := 0;
  error_list jsonb := '[]'::jsonb;
  current_error jsonb;
BEGIN
  -- Process each row in the JSON array
  FOR row_record IN SELECT jsonb_array_elements(rows)
  LOOP
    BEGIN
      INSERT INTO player_game_logs (
        player_id,
        player_name,
        team,
        opponent,
        season,
        date,
        prop_type,
        value,
        sport,
        league,
        game_id,
        home_away,
        weather_conditions,
        injury_status
      )
      VALUES (
        (row_record->>'player_id')::text,
        (row_record->>'player_name')::text,
        (row_record->>'team')::text,
        (row_record->>'opponent')::text,
        (row_record->>'season')::integer,
        (row_record->>'date')::date,
        (row_record->>'prop_type')::text,
        (row_record->>'value')::numeric,
        (row_record->>'sport')::text,
        (row_record->>'league')::text,
        (row_record->>'game_id')::text,
        (row_record->>'home_away')::text,
        COALESCE((row_record->>'weather_conditions')::text, 'unknown'),
        COALESCE((row_record->>'injury_status')::text, 'healthy')
      )
      ON CONFLICT (player_id, date, prop_type) 
      DO UPDATE SET
        player_name = EXCLUDED.player_name,
        team = EXCLUDED.team,
        opponent = EXCLUDED.opponent,
        value = EXCLUDED.value,
        sport = EXCLUDED.sport,
        league = EXCLUDED.league,
        game_id = EXCLUDED.game_id,
        home_away = EXCLUDED.home_away,
        weather_conditions = EXCLUDED.weather_conditions,
        injury_status = EXCLUDED.injury_status,
        updated_at = NOW();

      -- Check if this was an insert or update
      -- FOUND is automatically set by PostgreSQL after INSERT/UPDATE operations
      IF FOUND THEN
        -- Check if row existed before (this is an update)
        IF (SELECT COUNT(*) FROM player_game_logs WHERE 
            player_id = (row_record->>'player_id')::text 
            AND date = (row_record->>'date')::date 
            AND prop_type = (row_record->>'prop_type')::text) > 0 THEN
          update_count := update_count + 1;
        ELSE
          insert_count := insert_count + 1;
        END IF;
      ELSE
        insert_count := insert_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      current_error := jsonb_build_object(
        'player_id', row_record->>'player_id',
        'error', SQLERRM,
        'row', row_record
      );
      error_list := error_list || current_error;
    END;
  END LOOP;

  RETURN QUERY SELECT insert_count, update_count, error_count, error_list;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION bulk_upsert_proplines(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_upsert_proplines(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION bulk_upsert_player_game_logs(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_upsert_player_game_logs(jsonb) TO anon;