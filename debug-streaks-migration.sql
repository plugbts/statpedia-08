-- DEBUG STREAKS: Ultra-Simple Approach
-- This version uses basic window functions to avoid nested window function errors

-- 1. Create a simple streak detection view without complex logic
CREATE OR REPLACE VIEW debug_streak_analysis AS
WITH player_game_results AS (
    -- Get all player games with hit/miss results
    SELECT 
        pgl.player_id,
        pgl.player_name,
        pgl.team,
        pgl.prop_type,
        pgl.league,
        pgl.date,
        CASE WHEN pgl.value >= p.line THEN 1 ELSE 0 END as hit_result,
        ROW_NUMBER() OVER (
            PARTITION BY pgl.player_id, pgl.prop_type, pgl.league 
            ORDER BY pgl.date DESC
        ) as game_number
    FROM player_game_logs pgl
    JOIN proplines p ON pgl.player_id = p.player_id 
        AND pgl.date = p.date 
        AND pgl.prop_type = p.prop_type
        AND pgl.league = p.league
    WHERE pgl.date >= CURRENT_DATE - INTERVAL '30 days'
),
-- Simple approach: just look at the most recent games
recent_games AS (
    SELECT 
        player_id,
        player_name,
        team,
        prop_type,
        league,
        date,
        hit_result,
        game_number,
        -- Get previous game result
        LAG(hit_result) OVER (
            PARTITION BY player_id, prop_type, league 
            ORDER BY date DESC
        ) as prev_hit_result,
        -- Get next game result  
        LEAD(hit_result) OVER (
            PARTITION BY player_id, prop_type, league 
            ORDER BY date DESC
        ) as next_hit_result
    FROM player_game_results
)
SELECT 
    player_id,
    player_name,
    team,
    prop_type,
    league,
    date,
    hit_result,
    game_number,
    prev_hit_result,
    next_hit_result,
    -- Simple streak calculation for most recent game only
    CASE 
        WHEN game_number = 1 THEN 
            CASE 
                WHEN hit_result = prev_hit_result THEN 2  -- At least 2 if same as previous
                ELSE 1  -- Single game
            END
        ELSE NULL
    END as current_streak,
    CASE 
        WHEN game_number = 1 THEN 
            CASE 
                WHEN hit_result = 1 THEN 'hit'
                ELSE 'miss'
            END
        ELSE NULL
    END as current_streak_direction
FROM recent_games
ORDER BY player_id, prop_type, league, date DESC;

-- 2. Create a summary view to see all streaks (including length 1)
CREATE OR REPLACE VIEW debug_streak_summary AS
SELECT 
    player_id,
    player_name,
    team,
    prop_type,
    league,
    current_streak,
    current_streak_direction,
    COUNT(*) as total_games_in_streak,
    -- Show the streak quality
    CASE 
        WHEN current_streak >= 7 THEN 'Extreme'
        WHEN current_streak >= 5 THEN 'Very Strong'
        WHEN current_streak >= 3 THEN 'Strong'
        WHEN current_streak >= 2 THEN 'Moderate'
        WHEN current_streak = 1 THEN 'Single Game'
        ELSE 'No Streak'
    END as streak_quality
FROM debug_streak_analysis
WHERE current_streak IS NOT NULL
GROUP BY player_id, player_name, team, prop_type, league, current_streak, current_streak_direction
ORDER BY current_streak DESC, player_name;

-- 3. Create a simple count view to see what we have
CREATE OR REPLACE VIEW debug_streak_counts AS
SELECT 
    league,
    prop_type,
    current_streak,
    current_streak_direction,
    COUNT(*) as player_count
FROM debug_streak_summary
GROUP BY league, prop_type, current_streak, current_streak_direction
ORDER BY league, prop_type, current_streak DESC;

-- Grant permissions
GRANT SELECT ON debug_streak_analysis TO authenticated;
GRANT SELECT ON debug_streak_summary TO authenticated;
GRANT SELECT ON debug_streak_counts TO authenticated;
