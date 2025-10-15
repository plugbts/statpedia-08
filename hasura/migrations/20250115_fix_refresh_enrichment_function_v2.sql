-- Fix the refresh_enrichment function to match actual table structure
-- The table only has: id, player_id, game_id, league, streak, rating, matchup_rank, l5, l10, l20, created_at, updated_at

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
    
    -- Insert fresh enrichment data
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
        pgl.player_id,
        pgl.game_id,
        g.league,

        -- 🔥 Streaks (league-specific thresholds) - format as "X/Y" where X is hits, Y is total
        (
            SELECT CONCAT(
                COUNT(CASE WHEN (
                    (g.league = 'NBA' AND sub.points >= 10) OR
                    (g.league = 'NFL' AND sub.passing_yards >= 200) OR
                    (g.league = 'MLB' AND sub.hits >= 1) OR
                    (g.league = 'NHL' AND sub.goals >= 1) OR
                    (g.league = 'WNBA' AND sub.points >= 8)
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
          WHEN g.league = 'NBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'NFL' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'MLB' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'NHL' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'WNBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)
          ELSE NULL
        END AS l5,
        
        CASE 
          WHEN g.league = 'NBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'NFL' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'MLB' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'NHL' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'WNBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
          ELSE NULL
        END AS l10,
        
        CASE 
          WHEN g.league = 'NBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'NFL' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'MLB' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'NHL' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          WHEN g.league = 'WNBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
          ELSE NULL
        END AS l20,

        -- 🛡 Matchup rank (defensive rank by opponent)
        (
          SELECT tdr.passing_yards_allowed_rank
          FROM team_defense_ranks tdr
          WHERE tdr.team_id = pgl.opponent_team_id
            AND tdr.league = g.league
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
                  (g.league = 'NBA' AND sub.points >= 10) OR
                  (g.league = 'NFL' AND sub.passing_yards >= 200) OR
                  (g.league = 'MLB' AND sub.hits >= 1) OR
                  (g.league = 'NHL' AND sub.goals >= 1) OR
                  (g.league = 'WNBA' AND sub.points >= 8)
                )
            ) > 0 THEN 75
            ELSE 50
          END
        ) AS rating

    FROM player_game_logs pgl
    JOIN games_canonical g ON g.id = pgl.game_id
    WHERE pgl.game_date >= CURRENT_DATE - INTERVAL '30 days'; -- Only recent games for performance

    -- Get count
    SELECT COUNT(*) INTO players_processed FROM player_enriched_stats;
    
    end_time := NOW();
    
    -- Log the enrichment refresh
    RAISE NOTICE 'Enrichment refresh completed. Inserted % rows in % ms.', 
        players_processed, 
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;
