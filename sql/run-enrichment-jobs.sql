-- Run Player Props Enrichment Jobs
-- This script executes the enrichment processes to populate computed fields

-- =====================================================
-- STEP 1: SETUP AND VERIFICATION
-- =====================================================

-- Check if we have the necessary functions
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'compute_player_streaks',
    'compute_rolling_averages', 
    'compute_defensive_ranks',
    'refresh_player_analytics',
    'refresh_all_player_analytics'
  );

-- Check current state of player_game_logs
SELECT 
    'Current Data State' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT player_id) as unique_players,
    COUNT(DISTINCT prop_type) as unique_prop_types,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM public.player_game_logs
WHERE season = 2025;

-- Check current state of player_analytics
SELECT 
    'Analytics Table State' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT player_id) as unique_players,
    COUNT(DISTINCT prop_type) as unique_prop_types,
    MAX(last_updated) as last_updated
FROM public.player_analytics;

-- =====================================================
-- STEP 2: FIX OPPONENT RESOLUTION (if needed)
-- =====================================================

-- Run opponent resolution fix
SELECT public.update_missing_opponents();

-- Verify opponent resolution
SELECT * FROM public.verify_opponent_resolution();

-- =====================================================
-- STEP 3: TEST ENRICHMENT FUNCTIONS
-- =====================================================

-- Test with a sample player (replace with actual player_id from your data)
DO $$
DECLARE
    sample_player_id VARCHAR(64);
    sample_prop_type VARCHAR(64);
BEGIN
    -- Get a sample player and prop type
    SELECT player_id, prop_type
    INTO sample_player_id, sample_prop_type
    FROM public.player_game_logs
    WHERE season = 2025
    LIMIT 1;
    
    IF sample_player_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with player: %, prop: %', sample_player_id, sample_prop_type;
        
        -- Test streak computation
        RAISE NOTICE 'Testing streak computation...';
        -- This would be: SELECT * FROM public.compute_player_streaks(sample_player_id, sample_prop_type);
        
        -- Test rolling averages
        RAISE NOTICE 'Testing rolling averages...';
        -- This would be: SELECT * FROM public.compute_rolling_averages(sample_player_id, sample_prop_type);
        
        -- Test defensive ranks
        RAISE NOTICE 'Testing defensive ranks...';
        -- This would be: SELECT * FROM public.compute_defensive_ranks('KC', 'BUF', sample_prop_type);
    ELSE
        RAISE NOTICE 'No sample data found for testing';
    END IF;
END $$;

-- =====================================================
-- STEP 4: RUN ENRICHMENT FOR SAMPLE PLAYERS
-- =====================================================

-- Refresh analytics for a few sample players (replace with actual player_ids)
DO $$
DECLARE
    player_record RECORD;
    processed_count INT := 0;
BEGIN
    -- Process first 10 unique player-prop combinations
    FOR player_record IN
        SELECT DISTINCT player_id, prop_type
        FROM public.player_game_logs
        WHERE season = 2025
        LIMIT 10
    LOOP
        RAISE NOTICE 'Processing player: %, prop: %', player_record.player_id, player_record.prop_type;
        
        -- Refresh analytics for this player-prop combination
        PERFORM public.refresh_player_analytics(player_record.player_id, player_record.prop_type);
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Processed % sample player-prop combinations', processed_count;
END $$;

-- =====================================================
-- STEP 5: VERIFY ENRICHMENT RESULTS
-- =====================================================

-- Check the results of enrichment
SELECT 
    'Enrichment Results' as metric,
    COUNT(*) as total_analytics_records,
    COUNT(CASE WHEN current_streak > 0 THEN 1 END) as records_with_streaks,
    COUNT(CASE WHEN l5_games > 0 THEN 1 END) as records_with_l5_data,
    COUNT(CASE WHEN l10_games > 0 THEN 1 END) as records_with_l10_data,
    COUNT(CASE WHEN l20_games > 0 THEN 1 END) as records_with_l20_data,
    COUNT(CASE WHEN matchup_defensive_rank > 0 THEN 1 END) as records_with_defensive_ranks,
    COUNT(CASE WHEN matchup_rank_display != 'N/A' THEN 1 END) as records_with_rank_display
FROM public.player_analytics;

-- Show sample enriched data
SELECT 
    player_id,
    player_name,
    prop_type,
    current_streak,
    longest_streak,
    l5_games,
    l10_games,
    l20_games,
    matchup_defensive_rank,
    matchup_rank_display,
    last_updated
FROM public.player_analytics
WHERE current_streak > 0 
   OR l5_games > 0 
   OR matchup_defensive_rank > 0
LIMIT 10;

-- =====================================================
-- STEP 6: FULL ENRICHMENT (OPTIONAL - USE WITH CAUTION)
-- =====================================================

-- WARNING: This will process ALL player-prop combinations
-- Only run this if you want to refresh the entire analytics table
-- This may take a significant amount of time depending on data size

/*
-- Uncomment the line below to run full enrichment
-- SELECT public.refresh_all_player_analytics();
*/

-- =====================================================
-- STEP 7: CREATE ENRICHMENT MONITORING QUERY
-- =====================================================

-- Create a view to monitor enrichment status
CREATE OR REPLACE VIEW public.enrichment_status AS
WITH player_prop_combinations AS (
    SELECT DISTINCT player_id, prop_type
    FROM public.player_game_logs
    WHERE season = 2025
),
analytics_coverage AS (
    SELECT 
        COUNT(*) as total_combinations,
        COUNT(pa.player_id) as enriched_combinations
    FROM player_prop_combinations ppc
    LEFT JOIN public.player_analytics pa 
        ON ppc.player_id = pa.player_id 
        AND ppc.prop_type = pa.prop_type
        AND pa.sport = 'NFL'
),
quality_metrics AS (
    SELECT 
        COUNT(*) as total_analytics,
        COUNT(CASE WHEN current_streak >= 0 THEN 1 END) as has_streak_data,
        COUNT(CASE WHEN l5_games > 0 THEN 1 END) as has_l5_data,
        COUNT(CASE WHEN l10_games > 0 THEN 1 END) as has_l10_data,
        COUNT(CASE WHEN l20_games > 0 THEN 1 END) as has_l20_data,
        COUNT(CASE WHEN matchup_defensive_rank > 0 THEN 1 END) as has_defensive_rank,
        AVG(CASE WHEN last_updated > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as recently_updated_ratio
    FROM public.player_analytics
)
SELECT 
    'Coverage' as metric,
    ac.total_combinations::TEXT as total,
    ac.enriched_combinations::TEXT as enriched,
    ROUND(ac.enriched_combinations * 100.0 / ac.total_combinations, 2)::TEXT as percentage
FROM analytics_coverage ac
UNION ALL
SELECT 
    'Quality' as metric,
    qm.total_analytics::TEXT as total,
    qm.has_streak_data::TEXT as enriched,
    ROUND(qm.recently_updated_ratio * 100, 2)::TEXT as percentage
FROM quality_metrics qm;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- 1. Check enrichment status:
SELECT * FROM public.enrichment_status;

-- 2. Find players with missing analytics:
SELECT 
    ppc.player_id,
    ppc.prop_type,
    COUNT(*) as game_count
FROM (
    SELECT DISTINCT player_id, prop_type
    FROM public.player_game_logs
    WHERE season = 2025
) ppc
LEFT JOIN public.player_analytics pa 
    ON ppc.player_id = pa.player_id 
    AND ppc.prop_type = pa.prop_type
WHERE pa.player_id IS NULL
GROUP BY ppc.player_id, ppc.prop_type
ORDER BY game_count DESC
LIMIT 20;

-- 3. Check data quality issues:
SELECT 
    player_id,
    prop_type,
    current_streak,
    l5_games,
    l10_games,
    matchup_defensive_rank,
    last_updated
FROM public.player_analytics
WHERE current_streak < 0 
   OR l5_games < 0 
   OR l10_games < 0
   OR matchup_defensive_rank < 0
LIMIT 10;

-- 4. Get enrichment statistics:
SELECT 
    DATE(last_updated) as enrichment_date,
    COUNT(*) as records_updated,
    AVG(current_streak) as avg_streak,
    AVG(l5_games) as avg_l5_games,
    AVG(l10_games) as avg_l10_games
FROM public.player_analytics
GROUP BY DATE(last_updated)
ORDER BY enrichment_date DESC;
*/
