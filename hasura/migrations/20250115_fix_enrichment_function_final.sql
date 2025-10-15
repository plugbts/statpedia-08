-- Fix the refresh_enrichment function to handle duplicates and NULL leagues

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
    
    -- Insert enrichment data, handling duplicates with DISTINCT
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
    SELECT DISTINCT
        pgl.player_id,
        pgl.game_id,
        COALESCE(g.league, 'nfl') as league, -- Default to nfl if league is NULL

        -- 🔥 Streaks (league-specific thresholds) - format as "X/Y" where X is hits, Y is total
        (
            SELECT CONCAT(
                COUNT(CASE WHEN (
                    (COALESCE(g.league, 'nfl') = 'nba' AND sub.points >= 10) OR
                    (COALESCE(g.league, 'nfl') = 'nfl' AND sub.passing_yards >= 200) OR
                    (COALESCE(g.league, 'nfl') = 'mlb' AND sub.hits >= 1) OR
                    (COALESCE(g.league, 'nfl') = 'nhl' AND sub.goals >= 1) OR
                    (COALESCE(g.league, 'nfl') = 'wnba' AND sub.points >= 8)
                ) THEN 1 END), '/',
                COUNT(*)
            )
            FROM player_game_logs sub
            WHERE sub.player_id = pgl.player_id
              AND sub.game_date <= pgl.game_date
              AND sub.game_date >= pgl.game_date - INTERVAL '20 days'
        ) AS streak,

        -- 📊 Rolling averages (league-specific stats)
        CASE 
          WHEN COALESCE(g.league, 'nfl') = 'nba' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'nfl' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'mlb' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'nhl' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'wnba' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          ELSE NULL
        END AS l5,
        
        CASE 
          WHEN COALESCE(g.league, 'nfl') = 'nba' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'nfl' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'mlb' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'nhl' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'wnba' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          ELSE NULL
        END AS l10,
        
        CASE 
          WHEN COALESCE(g.league, 'nfl') = 'nba' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'nfl' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'mlb' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'nhl' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN COALESCE(g.league, 'nfl') = 'wnba' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          ELSE NULL
        END AS l20,

        -- 🛡 Matchup rank (defensive rank by opponent)
        (
          SELECT tdr.passing_yards_allowed_rank
          FROM team_defense_ranks tdr
          WHERE tdr.team_id = pgl.opponent_team_id
            AND tdr.league = COALESCE(g.league, 'nfl')
            AND tdr.season = g.season
            AND tdr.week = g.week
          LIMIT 1
        ) AS matchup_rank,

        -- ⭐ Rating (placeholder: combine streak + matchup rank)
        (
          CASE 
            WHEN (
              SELECT COUNT(*) 
              FROM player_game_logs sub
              WHERE sub.player_id = pgl.player_id
                AND sub.game_date <= pgl.game_date
                AND sub.game_date >= pgl.game_date - INTERVAL '10 days'
                AND (
                  (COALESCE(g.league, 'nfl') = 'nba' AND sub.points >= 10) OR
                  (COALESCE(g.league, 'nfl') = 'nfl' AND sub.passing_yards >= 200) OR
                  (COALESCE(g.league, 'nfl') = 'mlb' AND sub.hits >= 1) OR
                  (COALESCE(g.league, 'nfl') = 'nhl' AND sub.goals >= 1) OR
                  (COALESCE(g.league, 'nfl') = 'wnba' AND sub.points >= 8)
                )
            ) > 0 THEN 75
            ELSE 50
          END
        ) AS rating

    FROM player_game_logs pgl
    JOIN games_canonical g ON g.id = pgl.game_id
    WHERE pgl.game_date >= '2024-01-01';

    -- Get count
    SELECT COUNT(*) INTO players_processed FROM player_enriched_stats;
    
    end_time := NOW();
    
    -- Log the enrichment refresh
    RAISE NOTICE 'Enrichment refresh completed. Inserted % rows in % ms.', 
        players_processed, 
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;
