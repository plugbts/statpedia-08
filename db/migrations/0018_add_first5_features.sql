-- Add first-5-minute features for G1F5 prediction
ALTER TABLE public.icura_nhl_early_game_dataset
  ADD COLUMN IF NOT EXISTS home_team_xgf_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_team_shots_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_team_high_danger_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_team_rush_chances_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_team_time_to_first_shot NUMERIC,
  ADD COLUMN IF NOT EXISTS home_team_time_to_first_hd NUMERIC,
  ADD COLUMN IF NOT EXISTS home_team_time_to_first_rush NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_xgf_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_shots_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_high_danger_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_rush_chances_first5_last20 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_time_to_first_shot NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_time_to_first_hd NUMERIC,
  ADD COLUMN IF NOT EXISTS away_team_time_to_first_rush NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_save_pct_first5 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_gsax_first5 NUMERIC,
  ADD COLUMN IF NOT EXISTS home_goalie_rebound_rate_first5 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_save_pct_first5 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_gsax_first5 NUMERIC,
  ADD COLUMN IF NOT EXISTS away_goalie_rebound_rate_first5 NUMERIC;

