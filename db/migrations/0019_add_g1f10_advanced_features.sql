-- 0019: Add advanced G1F10 features to icura_nhl_early_game_dataset
-- These features are designed to push accuracy from 62.9% → 70%

-- Referee-level penalty rates
ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS ref_penalties_first_period_avg NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_penalties_first10_avg NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_minors_vs_majors_ratio NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_home_away_penalty_bias NUMERIC; -- -0.5 to 0.5

-- Shift-level matchup modeling
ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS home_top_line_xgf_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_top_line_xga_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_top_line_rush_rate_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_top_line_hd_rate_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_top_pair_xga_suppression_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_top_line_xgf_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_top_line_xga_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_top_line_rush_rate_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_top_line_hd_rate_first10_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_top_pair_xga_suppression_first10_last20 NUMERIC;

-- Penalty volatility features
ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS home_draw_penalty_rate_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_take_penalty_rate_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_draw_penalty_rate_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_take_penalty_rate_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS penalty_volatility_index NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_team_interaction_home NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_team_interaction_away NUMERIC;

-- Travel + fatigue interactions
ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS home_b2b_travel BOOLEAN,
  ADD COLUMN IF NOT EXISTS away_b2b_travel BOOLEAN,
  ADD COLUMN IF NOT EXISTS home_3in4_travel BOOLEAN,
  ADD COLUMN IF NOT EXISTS away_3in4_travel BOOLEAN,
  ADD COLUMN IF NOT EXISTS west_to_east_travel BOOLEAN,
  ADD COLUMN IF NOT EXISTS early_start_time BOOLEAN;

-- Goalie-specific early-game tendencies
ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS home_goalie_first_shot_save_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_first_3_shots_save_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_rebound_rate_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_rush_save_pct_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_screened_save_pct_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_first_shot_save_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_first_3_shots_save_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_rebound_rate_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_rush_save_pct_first10 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_screened_save_pct_first10 NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN public.icura_nhl_early_game_dataset.ref_penalties_first10_avg IS 'Average penalties per 10 minutes for this referee in first 10 minutes';
COMMENT ON COLUMN public.icura_nhl_early_game_dataset.ref_home_away_penalty_bias IS 'Referee bias toward home team (-0.5 to 0.5)';
COMMENT ON COLUMN public.icura_nhl_early_game_dataset.home_top_line_xgf_first10_last20 IS 'Top line expected goals for in first 10 minutes (last 20 games)';
COMMENT ON COLUMN public.icura_nhl_early_game_dataset.penalty_volatility_index IS 'Combined penalty volatility metric (higher = more penalties = more early goals)';
COMMENT ON COLUMN public.icura_nhl_early_game_dataset.home_b2b_travel IS 'Home team playing back-to-back with travel';
COMMENT ON COLUMN public.icura_nhl_early_game_dataset.home_goalie_first_shot_save_pct IS 'Goalie save percentage on first shot faced (historical)';

