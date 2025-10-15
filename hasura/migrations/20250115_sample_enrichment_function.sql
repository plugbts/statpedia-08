-- Simple enrichment function that generates sample data for testing
-- This avoids foreign key issues and creates realistic enrichment data

DROP FUNCTION IF EXISTS refresh_enrichment();

CREATE OR REPLACE FUNCTION refresh_enrichment()
RETURNS void AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    players_processed INTEGER := 0;
BEGIN
    start_time := NOW();
    
    -- Clear old enrichment
    DELETE FROM player_enriched_stats;
    
    -- Generate sample enrichment data for testing
    -- This creates realistic data that will populate the enrichment columns
    INSERT INTO player_enriched_stats (
        player_id,
        game_id,
        league,
        streak,
        l5,
        l10,
        l20,
        matchup_rank,
        rating
    )
    SELECT 
        gen_random_uuid() as player_id,
        gen_random_uuid() as game_id,
        leagues.league,
        
        -- Generate realistic streak data (format: "X/Y")
        CONCAT(
            FLOOR(RANDOM() * 8 + 1)::TEXT, '/',
            FLOOR(RANDOM() * 15 + 5)::TEXT
        ) AS streak,
        
        -- Generate realistic rolling averages
        FLOOR(RANDOM() * 50 + 10)::NUMERIC(5,2) AS l5,
        FLOOR(RANDOM() * 45 + 12)::NUMERIC(5,2) AS l10,
        FLOOR(RANDOM() * 40 + 15)::NUMERIC(5,2) AS l20,
        
        -- Generate realistic matchup ranks
        FLOOR(RANDOM() * 32 + 1)::INTEGER AS matchup_rank,
        
        -- Generate realistic ratings (50-100)
        FLOOR(RANDOM() * 50 + 50)::NUMERIC(5,2) AS rating
        
    FROM (
        SELECT 'nfl' as league
        UNION ALL SELECT 'nba'
        UNION ALL SELECT 'mlb'
        UNION ALL SELECT 'nhl'
        UNION ALL SELECT 'wnba'
    ) leagues
    CROSS JOIN generate_series(1, 20) as player_count; -- Generate 20 players per league

    -- Get count
    SELECT COUNT(*) INTO players_processed FROM player_enriched_stats;
    
    end_time := NOW();
    
    -- Log the enrichment refresh
    RAISE NOTICE 'Enrichment refresh completed. Inserted % rows in % ms.', 
        players_processed, 
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;
