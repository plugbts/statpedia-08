-- Analytics Schema Migration
-- Add missing fields to player_game_logs and create enrichment tables

-- Add missing fields to player_game_logs
ALTER TABLE player_game_logs 
ADD COLUMN IF NOT EXISTS points numeric,
ADD COLUMN IF NOT EXISTS rebounds numeric,
ADD COLUMN IF NOT EXISTS assists numeric,
ADD COLUMN IF NOT EXISTS steals numeric,
ADD COLUMN IF NOT EXISTS blocks numeric,
ADD COLUMN IF NOT EXISTS turnovers numeric,
ADD COLUMN IF NOT EXISTS minutes numeric,
ADD COLUMN IF NOT EXISTS field_goals_made numeric,
ADD COLUMN IF NOT EXISTS field_goals_attempted numeric,
ADD COLUMN IF NOT EXISTS three_pointers_made numeric,
ADD COLUMN IF NOT EXISTS three_pointers_attempted numeric,
ADD COLUMN IF NOT EXISTS free_throws_made numeric,
ADD COLUMN IF NOT EXISTS free_throws_attempted numeric;

-- Create player_enriched_stats table for caching analytics
CREATE TABLE IF NOT EXISTS player_enriched_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  prop_type text NOT NULL,
  
  -- Rolling averages
  avg_l5 numeric,
  avg_l10 numeric,
  avg_l20 numeric,
  
  -- Streaks
  current_streak integer DEFAULT 0, -- positive = overs, negative = unders
  max_streak integer DEFAULT 0,
  
  -- Matchup data
  opponent_rank integer,
  matchup_grade numeric,
  
  -- Hit rates
  hit_rate_l5 numeric,
  hit_rate_l10 numeric,
  hit_rate_l20 numeric,
  hit_rate_overall numeric,
  
  -- Game context
  home_away text CHECK (home_away IN ('home', 'away')),
  game_date date NOT NULL,
  season text NOT NULL,
  
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  
  UNIQUE(player_id, game_id, prop_type)
);

-- Create player_streaks table for streak tracking
CREATE TABLE IF NOT EXISTS player_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  prop_type text NOT NULL,
  condition_type text NOT NULL, -- 'over', 'under', 'exact'
  condition_value numeric NOT NULL,
  current_streak integer DEFAULT 0,
  max_streak integer DEFAULT 0,
  streak_start_date date,
  streak_end_date date,
  games_count integer DEFAULT 0,
  season text NOT NULL,
  
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  
  UNIQUE(player_id, prop_type, condition_type, condition_value, season)
);

-- Create team_defensive_stats table for matchup rankings
CREATE TABLE IF NOT EXISTS team_defensive_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  prop_type text NOT NULL,
  season text NOT NULL,
  
  -- Defensive stats
  avg_allowed numeric,
  rank integer, -- 1 = best defense, 32 = worst
  rank_percentile numeric, -- 0-100 percentile
  games_tracked integer DEFAULT 0,
  
  -- Home/Away splits
  avg_allowed_home numeric,
  avg_allowed_away numeric,
  rank_home integer,
  rank_away integer,
  
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  
  UNIQUE(team_id, prop_type, season)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_enriched_stats_player_game ON player_enriched_stats(player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_player_enriched_stats_prop_type ON player_enriched_stats(prop_type);
CREATE INDEX IF NOT EXISTS idx_player_enriched_stats_game_date ON player_enriched_stats(game_date);

CREATE INDEX IF NOT EXISTS idx_player_streaks_player_prop ON player_streaks(player_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_player_streaks_season ON player_streaks(season);

CREATE INDEX IF NOT EXISTS idx_team_defensive_stats_team_prop ON team_defensive_stats(team_id, prop_type);
CREATE INDEX IF NOT EXISTS idx_team_defensive_stats_league_season ON team_defensive_stats(league_id, season);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_enriched_stats_updated_at 
  BEFORE UPDATE ON player_enriched_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_streaks_updated_at 
  BEFORE UPDATE ON player_streaks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_defensive_stats_updated_at 
  BEFORE UPDATE ON team_defensive_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
