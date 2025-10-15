-- Enrichment Tables and Function Migration
-- This creates the necessary tables and function to populate enrichment columns

-- 1. Create player_game_logs table for historical performance data
CREATE TABLE IF NOT EXISTS player_game_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    game_id UUID NOT NULL,
    league VARCHAR(10) NOT NULL,
    game_date DATE NOT NULL,
    opponent_team_id UUID NOT NULL,
    
    -- Performance stats (league-agnostic)
    points DECIMAL(10,2),
    rebounds DECIMAL(10,2),
    assists DECIMAL(10,2),
    passing_yards DECIMAL(10,2),
    rushing_yards DECIMAL(10,2),
    receiving_yards DECIMAL(10,2),
    completions DECIMAL(10,2),
    attempts DECIMAL(10,2),
    touchdowns DECIMAL(10,2),
    interceptions DECIMAL(10,2),
    fumbles DECIMAL(10,2),
    catches DECIMAL(10,2),
    targets DECIMAL(10,2),
    carries DECIMAL(10,2),
    hits DECIMAL(10,2),
    runs DECIMAL(10,2),
    rbi DECIMAL(10,2),
    stolen_bases DECIMAL(10,2),
    goals DECIMAL(10,2),
    assists_hockey DECIMAL(10,2),
    shots DECIMAL(10,2),
    saves DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_player_game_logs_player FOREIGN KEY (player_id) REFERENCES players_canonical(id),
    CONSTRAINT fk_player_game_logs_game FOREIGN KEY (game_id) REFERENCES games_canonical(id),
    CONSTRAINT fk_player_game_logs_opponent FOREIGN KEY (opponent_team_id) REFERENCES teams_canonical(id)
);

-- 2. Create team_defense_ranks table for matchup analysis
CREATE TABLE IF NOT EXISTS team_defense_ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    league VARCHAR(10) NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER,
    
    -- Defensive rankings by category
    passing_yards_allowed_rank INTEGER,
    rushing_yards_allowed_rank INTEGER,
    points_allowed_rank INTEGER,
    rebounds_allowed_rank INTEGER,
    assists_allowed_rank INTEGER,
    goals_allowed_rank INTEGER,
    hits_allowed_rank INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_team_defense_ranks_team FOREIGN KEY (team_id) REFERENCES teams_canonical(id),
    UNIQUE(team_id, league, season, week)
);

-- 3. Create refresh_enrichment() function
CREATE OR REPLACE FUNCTION refresh_enrichment()
RETURNS void AS $$
BEGIN
  -- Clear old enrichment (optional, or use UPSERT instead)
  DELETE FROM player_enriched_stats;

  -- Insert fresh enrichment
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

    -- 🔥 Streaks (example: points >= 10 or passing_yards >= 200)
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

  -- Log the enrichment refresh
  RAISE NOTICE 'Enrichment refresh completed. Inserted % rows.', (SELECT COUNT(*) FROM player_enriched_stats);
END;
$$ LANGUAGE plpgsql;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_game_logs_player_date ON player_game_logs(player_id, game_date);
CREATE INDEX IF NOT EXISTS idx_player_game_logs_opponent ON player_game_logs(opponent_team_id);
CREATE INDEX IF NOT EXISTS idx_team_defense_ranks_team_season ON team_defense_ranks(team_id, league, season, week);

-- 5. Seed some sample data for testing
INSERT INTO player_game_logs (player_id, game_id, league, game_date, opponent_team_id, points, passing_yards, hits, goals)
SELECT 
    p.id,
    g.id,
    g.league,
    g.game_date,
    CASE WHEN g.home_team_id = p.team_id THEN g.away_team_id ELSE g.home_team_id END,
    CASE 
        WHEN g.league = 'NBA' THEN FLOOR(RANDOM() * 30 + 5)::DECIMAL(10,2)
        WHEN g.league = 'WNBA' THEN FLOOR(RANDOM() * 25 + 3)::DECIMAL(10,2)
        ELSE NULL
    END,
    CASE 
        WHEN g.league = 'NFL' THEN FLOOR(RANDOM() * 300 + 100)::DECIMAL(10,2)
        ELSE NULL
    END,
    CASE 
        WHEN g.league = 'MLB' THEN FLOOR(RANDOM() * 4 + 0)::DECIMAL(10,2)
        ELSE NULL
    END,
    CASE 
        WHEN g.league = 'NHL' THEN FLOOR(RANDOM() * 3 + 0)::DECIMAL(10,2)
        ELSE NULL
    END
FROM players_canonical p
JOIN games_canonical g ON g.league = p.league
WHERE g.game_date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 100;

-- 6. Seed team defense ranks
INSERT INTO team_defense_ranks (team_id, league, season, week, passing_yards_allowed_rank, points_allowed_rank)
SELECT 
    t.id,
    t.league,
    2025,
    EXTRACT(WEEK FROM CURRENT_DATE),
    FLOOR(RANDOM() * 32 + 1)::INTEGER,
    FLOOR(RANDOM() * 32 + 1)::INTEGER
FROM teams_canonical t
WHERE t.league IN ('NFL', 'NBA', 'MLB', 'NHL', 'WNBA');

-- 7. Run initial enrichment
SELECT refresh_enrichment();
