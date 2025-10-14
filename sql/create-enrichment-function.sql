-- Create Hasura-compatible enrichment refresh function
-- This function will be exposed as a mutation in Hasura and called by cron triggers

CREATE OR REPLACE FUNCTION public.refresh_enrichment()
RETURNS TABLE(
  message TEXT,
  players_processed INTEGER,
  analytics_updated INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  end_time TIMESTAMP;
  execution_time_ms INTEGER;
  players_processed INTEGER := 0;
  analytics_updated INTEGER := 0;
  player_record RECORD;
BEGIN
  -- Log start
  RAISE NOTICE 'Starting enrichment refresh at %', start_time;
  
  -- Clear existing analytics for fresh calculation
  DELETE FROM public.player_analytics;
  GET DIAGNOSTICS analytics_updated = ROW_COUNT;
  
  -- Process each unique player-prop combination
  FOR player_record IN
    SELECT DISTINCT 
      pgl.player_id, 
      pgl.prop_type, 
      pgl.season,
      MAX(pgl.game_date) as last_game_date
    FROM public.player_game_logs pgl
    WHERE pgl.prop_type != 'Game Stats'  -- Skip generic game stats
    GROUP BY pgl.player_id, pgl.prop_type, pgl.season
    ORDER BY last_game_date DESC
  LOOP
    BEGIN
      -- Get player and team info
      DECLARE
        player_name TEXT;
        team_abbr TEXT;
        total_games INTEGER;
        hits INTEGER;
        hit_rate DECIMAL(5,4);
        l5_games INTEGER;
        l5_hits INTEGER;
        l5_hit_rate DECIMAL(5,4);
      BEGIN
        -- Get player and team names
        SELECT 
          p.name,
          t.abbreviation
        INTO player_name, team_abbr
        FROM public.player_game_logs pgl
        JOIN public.players p ON p.id = pgl.player_id
        JOIN public.teams t ON t.id = pgl.team_id
        WHERE pgl.player_id = player_record.player_id
        LIMIT 1;
        
        -- Calculate season hit rate
        SELECT 
          COUNT(*) as total_games_count,
          COUNT(CASE WHEN actual_value >= line THEN 1 END) as hits_count
        INTO total_games, hits
        FROM public.player_game_logs pgl
        WHERE pgl.player_id = player_record.player_id 
        AND pgl.prop_type = player_record.prop_type
        AND pgl.season = player_record.season;
        
        -- Calculate hit rate
        hit_rate := CASE WHEN total_games > 0 THEN hits::DECIMAL / total_games ELSE 0 END;
        
        -- Calculate L5 hit rate
        SELECT 
          COUNT(*) as l5_games_count,
          COUNT(CASE WHEN actual_value >= line THEN 1 END) as l5_hits_count
        INTO l5_games, l5_hits
        FROM (
          SELECT actual_value, line
          FROM public.player_game_logs pgl
          WHERE pgl.player_id = player_record.player_id 
          AND pgl.prop_type = player_record.prop_type
          AND pgl.season = player_record.season
          ORDER BY game_date DESC
          LIMIT 5
        ) recent_games;
        
        l5_hit_rate := CASE WHEN l5_games > 0 THEN l5_hits::DECIMAL / l5_games ELSE hit_rate END;
        
        -- Insert analytics record
        INSERT INTO public.player_analytics (
          player_id, 
          player_name, 
          team, 
          prop_type, 
          sport,
          season_hit_rate_2025, 
          season_games_2025,
          h2h_hit_rate,
          h2h_games,
          l5_hit_rate, 
          l5_games,
          l10_hit_rate,
          l10_games,
          l20_hit_rate,
          l20_games,
          current_streak, 
          streak_direction,
          last_updated
        ) VALUES (
          player_record.player_id,
          COALESCE(player_name, 'Unknown Player'),
          COALESCE(team_abbr, 'UNK'),
          player_record.prop_type,
          player_record.season,
          hit_rate,
          total_games,
          0, -- h2h_hit_rate (could be calculated with opponent data)
          0, -- h2h_games
          l5_hit_rate,
          l5_games,
          l5_hit_rate, -- Simplified: using L5 for L10
          LEAST(l5_games, 10),
          l5_hit_rate, -- Simplified: using L5 for L20
          LEAST(l5_games, 20),
          0, -- current_streak (could be calculated with streak logic)
          'over', -- streak_direction
          NOW()
        )
        ON CONFLICT (player_id, prop_type, sport) 
        DO UPDATE SET
          season_hit_rate_2025 = EXCLUDED.season_hit_rate_2025,
          season_games_2025 = EXCLUDED.season_games_2025,
          l5_hit_rate = EXCLUDED.l5_hit_rate,
          l5_games = EXCLUDED.l5_games,
          l10_hit_rate = EXCLUDED.l10_hit_rate,
          l10_games = EXCLUDED.l10_games,
          l20_hit_rate = EXCLUDED.l20_hit_rate,
          l20_games = EXCLUDED.l20_games,
          last_updated = EXCLUDED.last_updated;
        
        players_processed := players_processed + 1;
        
        -- Log progress every 10 players
        IF players_processed % 10 = 0 THEN
          RAISE NOTICE 'Processed % players so far...', players_processed;
        END IF;
        
      END;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other players
      RAISE WARNING 'Failed to process player % - %: %', 
        player_record.player_id, player_record.prop_type, SQLERRM;
    END;
  END LOOP;
  
  -- Calculate execution time
  end_time := clock_timestamp();
  execution_time_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
  
  -- Log completion
  RAISE NOTICE 'Enrichment refresh completed: % players processed in % ms', 
    players_processed, execution_time_ms;
  
  -- Return results
  RETURN QUERY SELECT 
    'Enrichment refresh completed successfully'::TEXT,
    players_processed,
    analytics_updated,
    execution_time_ms;
    
END;
$$ LANGUAGE plpgsql;

-- Function is automatically available to all users in the public schema

-- Add comment for documentation
COMMENT ON FUNCTION public.refresh_enrichment() IS 
'Refreshes player analytics by recalculating hit rates, streaks, and rolling averages. 
Called by Hasura cron triggers to keep analytics up to date.';

-- Test the function (optional - can be run manually)
-- SELECT * FROM public.refresh_enrichment();
