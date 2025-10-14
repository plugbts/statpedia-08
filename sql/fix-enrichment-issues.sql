-- Fix Player Props Enrichment Issues
-- This script addresses the "–" and "N/A" placeholders in player props by fixing the enrichment layer

-- =====================================================
-- STEP 1: VERIFY OPPONENT RESOLUTION
-- =====================================================

-- Check if opponent_team_id is NULL in player_game_logs
-- (This assumes we're using the canonical schema with opponent_team_id field)
-- If using the historical schema, we need to check the 'opponent' field instead

-- For canonical schema (with opponent_team_id):
/*
SELECT g.api_game_id, pgl.player_id, pgl.team_id, 
       CASE 
         WHEN pgl.team_id = g.home_team_id THEN g.away_team_id
         WHEN pgl.team_id = g.away_team_id THEN g.home_team_id
       END AS opponent_team_id
FROM player_game_logs pgl
JOIN games g ON g.id = pgl.game_id
WHERE pgl.opponent_team_id IS NULL
LIMIT 20;
*/

-- For historical schema (with opponent field):
SELECT 
    pgl.player_id, 
    pgl.player_name,
    pgl.team, 
    pgl.opponent,
    pgl.prop_type,
    pgl.date,
    CASE 
        WHEN pgl.opponent IS NULL OR pgl.opponent = '' THEN 'NULL/EMPTY'
        WHEN pgl.opponent = 'OPP' THEN 'GENERIC_PLACEHOLDER'
        ELSE 'HAS_VALUE'
    END AS opponent_status
FROM public.player_game_logs pgl
WHERE pgl.opponent IS NULL 
   OR pgl.opponent = '' 
   OR pgl.opponent = 'OPP'
LIMIT 20;

-- =====================================================
-- STEP 2: COMPUTE STREAKS
-- =====================================================

-- Create or update function to compute streaks properly
CREATE OR REPLACE FUNCTION public.compute_player_streaks(
    p_player_id VARCHAR(64),
    p_prop_type VARCHAR(64),
    p_line FLOAT DEFAULT NULL
)
RETURNS TABLE(
    player_id VARCHAR(64),
    prop_type VARCHAR(64),
    current_streak INT,
    longest_streak INT,
    streak_direction VARCHAR(8),
    streak_details JSONB
) AS $$
DECLARE
    game_log RECORD;
    current_streak_count INT := 0;
    longest_streak_count INT := 0;
    current_direction VARCHAR(8) := 'over';
    streak_groups JSONB := '[]'::JSONB;
    current_group JSONB := '[]'::JSONB;
    last_hit BOOLEAN := NULL;
BEGIN
    -- Get game logs ordered by date DESC (most recent first)
    FOR game_log IN
        SELECT 
            date, 
            value,
            CASE 
                WHEN p_line IS NULL THEN TRUE  -- If no line, assume all games are hits
                WHEN value > p_line THEN TRUE
                ELSE FALSE
            END AS hit
        FROM public.player_game_logs
        WHERE player_id = p_player_id 
          AND prop_type = p_prop_type
        ORDER BY date DESC
    LOOP
        -- If this is the first game or direction changed, start new group
        IF last_hit IS NULL OR last_hit != game_log.hit THEN
            -- Save previous group if it exists
            IF current_group != '[]'::JSONB THEN
                streak_groups := streak_groups || jsonb_build_object(
                    'direction', CASE WHEN last_hit THEN 'over' ELSE 'under' END,
                    'length', jsonb_array_length(current_group)
                );
            END IF;
            
            -- Start new group
            current_group := jsonb_build_array(game_log);
            last_hit := game_log.hit;
        ELSE
            -- Add to current group
            current_group := current_group || jsonb_build_object(
                'date', game_log.date,
                'value', game_log.value,
                'hit', game_log.hit
            );
        END IF;
        
        -- Update current streak (from most recent game)
        IF current_streak_count = 0 AND game_log.hit THEN
            current_streak_count := 1;
            current_direction := 'over';
        ELSIF current_streak_count = 0 AND NOT game_log.hit THEN
            current_streak_count := 1;
            current_direction := 'under';
        ELSIF (current_direction = 'over' AND game_log.hit) OR 
              (current_direction = 'under' AND NOT game_log.hit) THEN
            current_streak_count := current_streak_count + 1;
        ELSE
            -- Direction changed, stop counting current streak
            EXIT;
        END IF;
    END LOOP;
    
    -- Calculate longest streak from all groups
    FOR game_log IN
        SELECT jsonb_array_length(value) as length
        FROM jsonb_array_elements(streak_groups)
    LOOP
        IF game_log.length > longest_streak_count THEN
            longest_streak_count := game_log.length;
        END IF;
    END LOOP;
    
    -- Build streak details
    streak_groups := jsonb_build_object(
        'groups', streak_groups,
        'current_group_length', current_streak_count,
        'current_direction', current_direction
    );
    
    RETURN QUERY SELECT 
        p_player_id,
        p_prop_type,
        current_streak_count,
        longest_streak_count,
        current_direction,
        streak_groups;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: COMPUTE ROLLING AVERAGES (L5/L10/L20)
-- =====================================================

-- Create function to compute rolling averages
CREATE OR REPLACE FUNCTION public.compute_rolling_averages(
    p_player_id VARCHAR(64),
    p_prop_type VARCHAR(64)
)
RETURNS TABLE(
    player_id VARCHAR(64),
    prop_type VARCHAR(64),
    l5_avg FLOAT,
    l5_games INT,
    l10_avg FLOAT,
    l10_games INT,
    l20_avg FLOAT,
    l20_games INT,
    season_avg FLOAT,
    season_games INT
) AS $$
BEGIN
    RETURN QUERY
    WITH ordered_games AS (
        SELECT 
            date,
            value,
            ROW_NUMBER() OVER (ORDER BY date DESC) as rn
        FROM public.player_game_logs
        WHERE player_id = p_player_id 
          AND prop_type = p_prop_type
        ORDER BY date DESC
    ),
    rolling_stats AS (
        SELECT 
            -- L5 (last 5 games)
            AVG(CASE WHEN rn <= 5 THEN value END) as l5_avg,
            COUNT(CASE WHEN rn <= 5 THEN 1 END) as l5_games,
            
            -- L10 (last 10 games)
            AVG(CASE WHEN rn <= 10 THEN value END) as l10_avg,
            COUNT(CASE WHEN rn <= 10 THEN 1 END) as l10_games,
            
            -- L20 (last 20 games)
            AVG(CASE WHEN rn <= 20 THEN value END) as l20_avg,
            COUNT(CASE WHEN rn <= 20 THEN 1 END) as l20_games,
            
            -- Season average (all games in 2025)
            AVG(CASE WHEN EXTRACT(YEAR FROM date) = 2025 THEN value END) as season_avg,
            COUNT(CASE WHEN EXTRACT(YEAR FROM date) = 2025 THEN 1 END) as season_games
        FROM ordered_games
    )
    SELECT 
        p_player_id,
        p_prop_type,
        COALESCE(rolling_stats.l5_avg, 0.0)::FLOAT,
        COALESCE(rolling_stats.l5_games, 0),
        COALESCE(rolling_stats.l10_avg, 0.0)::FLOAT,
        COALESCE(rolling_stats.l10_games, 0),
        COALESCE(rolling_stats.l20_avg, 0.0)::FLOAT,
        COALESCE(rolling_stats.l20_games, 0),
        COALESCE(rolling_stats.season_avg, 0.0)::FLOAT,
        COALESCE(rolling_stats.season_games, 0)
    FROM rolling_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: COMPUTE MATCHUP/DEFENSIVE RANKS
-- =====================================================

-- Create function to compute defensive ranks
CREATE OR REPLACE FUNCTION public.compute_defensive_ranks(
    p_team VARCHAR(8),
    p_opponent VARCHAR(8),
    p_prop_type VARCHAR(64),
    p_position VARCHAR(8) DEFAULT NULL
)
RETURNS TABLE(
    team VARCHAR(8),
    opponent VARCHAR(8),
    prop_type VARCHAR(64),
    defensive_rank INT,
    avg_allowed FLOAT,
    games_played INT,
    rank_display VARCHAR(16)
) AS $$
BEGIN
    RETURN QUERY
    WITH opponent_defense AS (
        SELECT 
            pgl.opponent as defending_team,
            pgl.prop_type,
            AVG(pgl.value) as avg_allowed,
            COUNT(*) as games_played
        FROM public.player_game_logs pgl
        WHERE pgl.team = p_opponent  -- The opponent is defending
          AND pgl.prop_type = p_prop_type
          AND pgl.season = 2025
          AND (p_position IS NULL OR pgl.position = p_position)
        GROUP BY pgl.opponent, pgl.prop_type
    ),
    ranked_defense AS (
        SELECT 
            defending_team,
            prop_type,
            avg_allowed,
            games_played,
            RANK() OVER (ORDER BY avg_allowed DESC) as rank_num  -- Higher avg_allowed = easier defense
        FROM opponent_defense
    )
    SELECT 
        p_team,
        p_opponent,
        p_prop_type,
        COALESCE(ranked_defense.rank_num::INT, 0),
        COALESCE(ranked_defense.avg_allowed::FLOAT, 0.0),
        COALESCE(ranked_defense.games_played, 0),
        CASE 
            WHEN ranked_defense.rank_num IS NULL THEN 'N/A'
            WHEN ranked_defense.rank_num <= 5 THEN 'Top 5'
            WHEN ranked_defense.rank_num <= 10 THEN 'Top 10'
            WHEN ranked_defense.rank_num <= 15 THEN 'Top 15'
            WHEN ranked_defense.rank_num <= 20 THEN 'Top 20'
            ELSE 'Bottom 10'
        END
    FROM ranked_defense
    WHERE defending_team = p_opponent
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: UPDATE PLAYER ANALYTICS TABLE
-- =====================================================

-- Create or update function to refresh all analytics for a player
CREATE OR REPLACE FUNCTION public.refresh_player_analytics(
    p_player_id VARCHAR(64),
    p_prop_type VARCHAR(64),
    p_line FLOAT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    player_info RECORD;
    streak_stats RECORD;
    rolling_stats RECORD;
    defense_stats RECORD;
BEGIN
    -- Get player info
    SELECT player_name, team, sport, position
    INTO player_info
    FROM public.player_game_logs
    WHERE player_id = p_player_id
    LIMIT 1;
    
    IF player_info IS NULL THEN
        RAISE NOTICE 'No player found with ID: %', p_player_id;
        RETURN;
    END IF;
    
    -- Get streak stats
    SELECT * INTO streak_stats
    FROM public.compute_player_streaks(p_player_id, p_prop_type, p_line);
    
    -- Get rolling averages
    SELECT * INTO rolling_stats
    FROM public.compute_rolling_averages(p_player_id, p_prop_type);
    
    -- Get defensive rank (using a generic opponent for now)
    SELECT * INTO defense_stats
    FROM public.compute_defensive_ranks(player_info.team, 'OPP', p_prop_type, player_info.position);
    
    -- Upsert analytics
    INSERT INTO public.player_analytics (
        player_id, player_name, team, prop_type, sport, position,
        season_hit_rate_2025, season_games_2025,
        l5_hit_rate, l5_games,
        l10_hit_rate, l10_games,
        l20_hit_rate, l20_games,
        current_streak, longest_streak, streak_direction,
        matchup_defensive_rank, matchup_rank_display,
        last_updated
    ) VALUES (
        p_player_id, 
        player_info.player_name, 
        player_info.team, 
        p_prop_type, 
        player_info.sport, 
        player_info.position,
        COALESCE(rolling_stats.season_avg, 0.0),  -- Using season avg as hit rate for now
        COALESCE(rolling_stats.season_games, 0),
        COALESCE(rolling_stats.l5_avg, 0.0),
        COALESCE(rolling_stats.l5_games, 0),
        COALESCE(rolling_stats.l10_avg, 0.0),
        COALESCE(rolling_stats.l10_games, 0),
        COALESCE(rolling_stats.l20_avg, 0.0),
        COALESCE(rolling_stats.l20_games, 0),
        COALESCE(streak_stats.current_streak, 0),
        COALESCE(streak_stats.longest_streak, 0),
        COALESCE(streak_stats.streak_direction, 'over'),
        COALESCE(defense_stats.defensive_rank, 0),
        COALESCE(defense_stats.rank_display, 'N/A'),
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
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        streak_direction = EXCLUDED.streak_direction,
        matchup_defensive_rank = EXCLUDED.matchup_defensive_rank,
        matchup_rank_display = EXCLUDED.matchup_rank_display,
        last_updated = EXCLUDED.last_updated;
        
    RAISE NOTICE 'Updated analytics for player % - % %', p_player_id, player_info.player_name, p_prop_type;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: BATCH UPDATE ALL PLAYERS
-- =====================================================

-- Create function to refresh analytics for all players
CREATE OR REPLACE FUNCTION public.refresh_all_player_analytics()
RETURNS VOID AS $$
DECLARE
    player_prop RECORD;
    processed_count INT := 0;
BEGIN
    -- Process each unique player-prop combination
    FOR player_prop IN
        SELECT DISTINCT player_id, prop_type
        FROM public.player_game_logs
        WHERE season = 2025  -- Focus on current season
        ORDER BY player_id, prop_type
    LOOP
        -- Refresh analytics for this player-prop combination
        PERFORM public.refresh_player_analytics(player_prop.player_id, player_prop.prop_type);
        
        processed_count := processed_count + 1;
        
        -- Log progress every 100 records
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE 'Processed % player-prop combinations', processed_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed refresh of % player-prop combinations', processed_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- 1. Check opponent resolution issues:
SELECT * FROM (
    SELECT 
        player_id, 
        player_name,
        team, 
        opponent,
        prop_type,
        date,
        CASE 
            WHEN opponent IS NULL OR opponent = '' THEN 'NULL/EMPTY'
            WHEN opponent = 'OPP' THEN 'GENERIC_PLACEHOLDER'
            ELSE 'HAS_VALUE'
        END AS opponent_status
    FROM public.player_game_logs
) t WHERE opponent_status != 'HAS_VALUE'
LIMIT 20;

-- 2. Test streak computation:
SELECT * FROM public.compute_player_streaks('player_123', 'Passing Yards', 250.0);

-- 3. Test rolling averages:
SELECT * FROM public.compute_rolling_averages('player_123', 'Passing Yards');

-- 4. Test defensive ranks:
SELECT * FROM public.compute_defensive_ranks('KC', 'BUF', 'Passing Yards', 'QB');

-- 5. Refresh analytics for a specific player:
SELECT public.refresh_player_analytics('player_123', 'Passing Yards', 250.0);

-- 6. Refresh all analytics (this may take a while):
SELECT public.refresh_all_player_analytics();
*/
