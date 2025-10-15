-- Minimal CI migration placeholder
-- Creates a stub debug_pipeline() so CI can call it safely on ephemeral DBs.

CREATE OR REPLACE FUNCTION debug_pipeline()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'missing_players', 0,
    'missing_team_ids', 0,
    'missing_opponent_ids', 0,
    'unenriched_count', 0,
    'ev_null_or_zero', 0,
    'streak_null', 0,
    'rating_stuck_68', 0,
    'matchup_rank_null', 0,
    'rolling_na', 0
  );
END;
$$ LANGUAGE plpgsql;

-- Keep this file light; real migrations should live in versioned files.