-- Enrichment function using existing players from players_canonical
-- This creates realistic enrichment data for testing

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
    
    -- Generate enrichment data using existing players
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
        p.id as player_id,
        gen_random_uuid() as game_id,
        p.league,
        
        -- Generate realistic streak data (format: "X/Y")
        CONCAT(
            FLOOR(RANDOM() * 8 + 1)::TEXT, '/',
            FLOOR(RANDOM() * 15 + 5)::TEXT
        ) AS streak,
        
        -- Generate realistic rolling averages based on player type
        CASE 
            WHEN p.display_name ILIKE '%burrow%' THEN FLOOR(RANDOM() * 100 + 200)::NUMERIC(5,2) -- Passing yards
            WHEN p.display_name ILIKE '%chase%' THEN FLOOR(RANDOM() * 50 + 50)::NUMERIC(5,2)   -- Receiving yards
            ELSE FLOOR(RANDOM() * 50 + 10)::NUMERIC(5,2)
        END AS l5,
        
        CASE 
            WHEN p.display_name ILIKE '%burrow%' THEN FLOOR(RANDOM() * 90 + 180)::NUMERIC(5,2) -- Passing yards
            WHEN p.display_name ILIKE '%chase%' THEN FLOOR(RANDOM() * 45 + 45)::NUMERIC(5,2)   -- Receiving yards
            ELSE FLOOR(RANDOM() * 45 + 12)::NUMERIC(5,2)
        END AS l10,
        
        CASE 
            WHEN p.display_name ILIKE '%burrow%' THEN FLOOR(RANDOM() * 80 + 160)::NUMERIC(5,2) -- Passing yards
            WHEN p.display_name ILIKE '%chase%' THEN FLOOR(RANDOM() * 40 + 40)::NUMERIC(5,2)   -- Receiving yards
            ELSE FLOOR(RANDOM() * 40 + 15)::NUMERIC(5,2)
        END AS l20,
        
        -- Generate realistic matchup ranks
        FLOOR(RANDOM() * 32 + 1)::INTEGER AS matchup_rank,
        
        -- Generate realistic ratings (50-100)
        FLOOR(RANDOM() * 50 + 50)::NUMERIC(5,2) AS rating
        
    FROM players_canonical p
    CROSS JOIN generate_series(1, 5) as game_count; -- Generate 5 games per player

    -- Get count
    SELECT COUNT(*) INTO players_processed FROM player_enriched_stats;
    
    end_time := NOW();
    
    -- Log the enrichment refresh
    RAISE NOTICE 'Enrichment refresh completed. Inserted % rows in % ms.', 
        players_processed, 
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;
