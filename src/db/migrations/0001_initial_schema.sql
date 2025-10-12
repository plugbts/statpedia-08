-- Initial schema migration for StatPedia
-- This file contains the SQL equivalent of our Drizzle schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL,
  season TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  total_teams INTEGER,
  playoff_teams INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  name TEXT NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  city TEXT NOT NULL,
  full_name TEXT NOT NULL,
  conference TEXT,
  division TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  home_venue TEXT,
  is_active BOOLEAN DEFAULT true,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  win_percentage DECIMAL(5,3),
  external_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  position_category TEXT NOT NULL,
  jersey_number INTEGER,
  height DECIMAL(4,1),
  weight INTEGER,
  age INTEGER,
  birth_date DATE,
  college TEXT,
  experience INTEGER DEFAULT 0,
  salary DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  is_rookie BOOLEAN DEFAULT false,
  is_injured BOOLEAN DEFAULT false,
  injury_status TEXT,
  average_minutes DECIMAL(4,1),
  average_points DECIMAL(5,1),
  average_rebounds DECIMAL(4,1),
  average_assists DECIMAL(4,1),
  external_id TEXT UNIQUE,
  espn_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  home_team_id UUID NOT NULL REFERENCES teams(id),
  away_team_id UUID NOT NULL REFERENCES teams(id),
  season TEXT NOT NULL,
  season_type TEXT NOT NULL DEFAULT 'regular',
  week INTEGER,
  game_date DATE NOT NULL,
  game_time TIME,
  game_date_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  venue TEXT,
  attendance INTEGER,
  weather TEXT,
  home_score INTEGER,
  away_score INTEGER,
  home_score_q1 INTEGER,
  home_score_q2 INTEGER,
  home_score_q3 INTEGER,
  home_score_q4 INTEGER,
  home_score_ot INTEGER,
  away_score_q1 INTEGER,
  away_score_q2 INTEGER,
  away_score_q3 INTEGER,
  away_score_q4 INTEGER,
  away_score_ot INTEGER,
  total_points INTEGER,
  home_team_spread DECIMAL(6,1),
  total_over_under DECIMAL(6,1),
  external_id TEXT UNIQUE,
  espn_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prop_types table
CREATE TABLE IF NOT EXISTS prop_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sport TEXT NOT NULL,
  unit TEXT,
  is_over_under BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create player_props table
CREATE TABLE IF NOT EXISTS player_props (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id),
  game_id UUID NOT NULL REFERENCES games(id),
  prop_type_id UUID NOT NULL REFERENCES prop_types(id),
  line DECIMAL(8,2) NOT NULL,
  odds VARCHAR(10),
  over_odds VARCHAR(10),
  under_odds VARCHAR(10),
  hit_rate DECIMAL(5,2),
  games_tracked INTEGER DEFAULT 0,
  avg_actual_value DECIMAL(8,2),
  last_10_avg DECIMAL(8,2),
  season_avg DECIMAL(8,2),
  vs_opponent_avg DECIMAL(8,2),
  home_away_avg DECIMAL(8,2),
  usage_rate DECIMAL(5,2),
  pace_factor DECIMAL(5,2),
  defensive_rating DECIMAL(8,2),
  offensive_rating DECIMAL(8,2),
  injury_status TEXT,
  rest_days INTEGER,
  weather_conditions TEXT,
  is_home BOOLEAN,
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  external_id TEXT,
  sportsbook TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_games_league_id ON games(league_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team_id ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team_id ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_game_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_player_props_player_id ON player_props(player_id);
CREATE INDEX IF NOT EXISTS idx_player_props_game_id ON player_props(game_id);
CREATE INDEX IF NOT EXISTS idx_player_props_prop_type_id ON player_props(prop_type_id);
CREATE INDEX IF NOT EXISTS idx_player_props_is_active ON player_props(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prop_types_updated_at
  BEFORE UPDATE ON prop_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_props_updated_at
  BEFORE UPDATE ON player_props
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
