-- Fix the refresh_enrichment function
-- The previous version had issues with the return type and data insertion

DROP FUNCTION IF EXISTS refresh_enrichment();

CREATE OR REPLACE FUNCTION refresh_enrichment()
RETURNS void AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    players_processed INTEGER := 0;
    analytics_updated INTEGER := 0;
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
        season_avg,
        matchup_rank,
        h2h_avg,
        ev_percent,
        rating
    )
    SELECT
        pgl.player_id,
        pgl.game_id,
        g.league,

        -- 🔥 Streaks (league-specific thresholds)
        (
            SELECT COUNT(*) 
            FROM player_game_logs sub
            WHERE sub.player_id = pgl.player_id
              AND sub.game_date <= pgl.game_date
              AND (
                (g.league = 'NBA' AND sub.points >= 10) OR
                (g.league = 'NFL' AND sub.passing_yards >= 200) OR
                (g.league = 'MLB' AND sub.hits >= 1) OR
                (g.league = 'NHL' AND sub.goals >= 1) OR
                (g.league = 'WNBA' AND sub.points >= 8)
              )
              AND NOT EXISTS (
                SELECT 1 FROM player_game_logs break
                WHERE break.player_id = pgl.player_id
                  AND break.game_date < pgl.game_date
                  AND break.game_date > sub.game_date
                  AND (
                    (g.league = 'NBA' AND break.points < 10) OR
                    (g.league = 'NFL' AND break.passing_yards < 200) OR
                    (g.league = 'MLB' AND break.hits < 1) OR
                    (g.league = 'NHL' AND break.goals < 1) OR
                    (g.league = 'WNBA' AND break.points < 8)
                  )
              )
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

        -- 📅 Season average (league-specific stats)
        CASE 
          WHEN g.league = 'NBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id, g.season)
          WHEN g.league = 'NFL' THEN AVG(pgl.passing_yards) OVER (PARTITION BY pgl.player_id, g.season)
          WHEN g.league = 'MLB' THEN AVG(pgl.hits) OVER (PARTITION BY pgl.player_id, g.season)
          WHEN g.league = 'NHL' THEN AVG(pgl.goals) OVER (PARTITION BY pgl.player_id, g.season)
          WHEN g.league = 'WNBA' THEN AVG(pgl.points) OVER (PARTITION BY pgl.player_id, g.season)
          ELSE NULL
        END AS season_avg,

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

        -- 🤝 Head‑to‑head average vs this opponent
        (
          SELECT AVG(
            CASE 
              WHEN g.league = 'NBA' THEN sub.points
              WHEN g.league = 'NFL' THEN sub.passing_yards
              WHEN g.league = 'MLB' THEN sub.hits
              WHEN g.league = 'NHL' THEN sub.goals
              WHEN g.league = 'WNBA' THEN sub.points
              ELSE NULL
            END
          )
          FROM player_game_logs sub
          WHERE sub.player_id = pgl.player_id
            AND sub.opponent_team_id = pgl.opponent_team_id
            AND sub.game_date < pgl.game_date
        ) AS h2h_avg,

        -- 📈 EV% (expected value vs line) - placeholder for now
        NULL AS ev_percent,

        -- ⭐ Rating (placeholder: combine streak + matchup rank)
        (
          CASE 
            WHEN (
              SELECT COUNT(*) 
              FROM player_game_logs sub
              WHERE sub.player_id = pgl.player_id
                AND sub.game_date <= pgl.game_date
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

    -- Get counts
    SELECT COUNT(*) INTO players_processed FROM player_enriched_stats;
    analytics_updated := players_processed;
    
    end_time := NOW();
    
    -- Log the enrichment refresh
    RAISE NOTICE 'Enrichment refresh completed. Inserted % rows in % ms.', 
        players_processed, 
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
END;
$$ LANGUAGE plpgsql;
