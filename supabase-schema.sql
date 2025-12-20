CREATE TABLE IF NOT EXISTS auth_audit (
  id BIGINT NOT NULL DEFAULT nextval('auth_audit_id_seq'::regclass),
  user_id UUID,
  event TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auth_audit ADD CONSTRAINT auth_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS auth_credential (
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'argon2id'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auth_credential ADD CONSTRAINT auth_credential_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS auth_identity (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auth_identity ADD CONSTRAINT auth_identity_provider_provider_user_id_key UNIQUE (provider, provider_user_id);
ALTER TABLE auth_identity ADD CONSTRAINT auth_identity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS auth_session (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT
);
ALTER TABLE auth_session ADD CONSTRAINT auth_session_refresh_token_key UNIQUE (refresh_token);
ALTER TABLE auth_session ADD CONSTRAINT auth_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS auth_user (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled BOOLEAN NOT NULL DEFAULT false,
  username TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'::text
);
ALTER TABLE auth_user ADD CONSTRAINT auth_user_email_key UNIQUE (email);
ALTER TABLE auth_user ADD CONSTRAINT auth_user_username_key UNIQUE (username);


CREATE TABLE IF NOT EXISTS auth_verification_token (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auth_verification_token ADD CONSTRAINT auth_verification_token_token_key UNIQUE (token);
ALTER TABLE auth_verification_token ADD CONSTRAINT auth_verification_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS games (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL,
  home_team_id UUID NOT NULL,
  away_team_id UUID NOT NULL,
  season TEXT NOT NULL,
  season_type TEXT NOT NULL DEFAULT 'regular'::text,
  week INTEGER,
  game_date DATE NOT NULL,
  game_time TIME WITHOUT TIME ZONE,
  game_date_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled'::text,
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
  home_team_spread NUMERIC,
  total_over_under NUMERIC,
  external_id TEXT,
  espn_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  api_game_id TEXT
);
ALTER TABLE games ADD CONSTRAINT games_external_id_key UNIQUE (external_id);
ALTER TABLE games ADD CONSTRAINT games_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id);
ALTER TABLE games ADD CONSTRAINT games_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id);
ALTER TABLE games ADD CONSTRAINT games_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES teams(id);


CREATE TABLE IF NOT EXISTS leagues (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  sport TEXT,
  season TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  total_teams INTEGER,
  playoff_teams INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  code TEXT
);
ALTER TABLE leagues ADD CONSTRAINT leagues_name_key UNIQUE (name);
ALTER TABLE leagues ADD CONSTRAINT leagues_abbreviation_key UNIQUE (abbreviation);


CREATE TABLE IF NOT EXISTS missing_players (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  league TEXT NOT NULL,
  generated_id TEXT NOT NULL,
  sample_odd_id TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE missing_players ADD CONSTRAINT missing_players_player_name_team_league_generated_id_key UNIQUE (player_name, team, league, generated_id);


CREATE TABLE IF NOT EXISTS pickem_props (
  id INTEGER NOT NULL DEFAULT nextval('pickem_props_id_seq'::regclass),
  player_id UUID,
  team_id UUID,
  game_id TEXT,
  prop_type TEXT,
  line NUMERIC,
  pickem_site TEXT,
  over_projection NUMERIC,
  under_projection NUMERIC,
  updated_at TIMESTAMP DEFAULT now(),
  conflict_key TEXT
);
ALTER TABLE pickem_props ADD CONSTRAINT pickem_props_conflict_key_key UNIQUE (conflict_key);


CREATE TABLE IF NOT EXISTS player_analytics (
  player_id UUID NOT NULL,
  prop_type TEXT NOT NULL,
  season TEXT NOT NULL,
  sport TEXT,
  opponent_team_id UUID,
  l5 NUMERIC,
  l10 NUMERIC,
  l20 NUMERIC,
  current_streak INTEGER,
  h2h_avg NUMERIC,
  season_avg NUMERIC,
  matchup_rank INTEGER,
  ev_percent NUMERIC,
  last_updated TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS player_enriched_stats (
  player_id UUID NOT NULL,
  game_id UUID NOT NULL,
  market TEXT,
  season INTEGER,
  opponent_team_id UUID,
  ev_percent NUMERIC,
  streak_l5 INTEGER,
  rating NUMERIC,
  matchup_rank INTEGER,
  l5 NUMERIC,
  l10 NUMERIC,
  l20 NUMERIC,
  h2h_avg NUMERIC,
  season_avg NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS player_external_ids (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE player_external_ids ADD CONSTRAINT player_external_ids_unique UNIQUE (provider, external_id);
ALTER TABLE player_external_ids ADD CONSTRAINT player_external_ids_player_id_fkey FOREIGN KEY (player_id) REFERENCES players_canonical(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS player_game_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL,
  game_id UUID NOT NULL,
  prop_type TEXT NOT NULL,
  actual_value NUMERIC,
  line NUMERIC,
  hit BOOLEAN,
  team_id UUID,
  opponent_team_id UUID,
  game_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  opponent_id UUID,
  season TEXT,
  home_away TEXT
);
ALTER TABLE player_game_logs ADD CONSTRAINT player_game_logs_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE player_game_logs ADD CONSTRAINT player_game_logs_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_game_logs ADD CONSTRAINT player_game_logs_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id);
ALTER TABLE player_game_logs ADD CONSTRAINT player_game_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE player_game_logs ADD CONSTRAINT player_game_logs_opponent_team_id_fkey FOREIGN KEY (opponent_team_id) REFERENCES teams(id);


CREATE TABLE IF NOT EXISTS player_game_logs_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  league TEXT NOT NULL,
  season TEXT,
  game_external_id TEXT NOT NULL,
  player_external_id TEXT,
  team_abbrev TEXT,
  opponent_abbrev TEXT,
  payload JSONB NOT NULL,
  source TEXT DEFAULT 'official'::text,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  normalized BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE player_game_logs_raw ADD CONSTRAINT uq_pglr_league_game_source UNIQUE (league, game_external_id, source);


CREATE TABLE IF NOT EXISTS player_props (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL,
  game_id UUID NOT NULL,
  prop_type_id UUID NOT NULL,
  line NUMERIC NOT NULL,
  odds VARCHAR(10),
  over_odds VARCHAR(10),
  under_odds VARCHAR(10),
  hit_rate NUMERIC,
  games_tracked INTEGER DEFAULT 0,
  avg_actual_value NUMERIC,
  last_10_avg NUMERIC,
  season_avg NUMERIC,
  vs_opponent_avg NUMERIC,
  home_away_avg NUMERIC,
  usage_rate NUMERIC,
  pace_factor NUMERIC,
  defensive_rating NUMERIC,
  offensive_rating NUMERIC,
  injury_status TEXT,
  rest_days INTEGER,
  weather_conditions TEXT,
  is_home BOOLEAN,
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  external_id TEXT,
  sportsbook TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id UUID,
  opponent_team_id UUID,
  odds_american INTEGER,
  over_odds_american INTEGER,
  under_odds_american INTEGER
);
ALTER TABLE player_props ADD CONSTRAINT player_props_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
ALTER TABLE player_props ADD CONSTRAINT player_props_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id);
ALTER TABLE player_props ADD CONSTRAINT player_props_prop_type_id_fkey FOREIGN KEY (prop_type_id) REFERENCES prop_types(id);
ALTER TABLE player_props ADD CONSTRAINT player_props_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE player_props ADD CONSTRAINT player_props_opponent_team_id_fkey FOREIGN KEY (opponent_team_id) REFERENCES teams(id);


CREATE TABLE IF NOT EXISTS players (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  team_id UUID,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  position_category TEXT,
  jersey_number INTEGER,
  height NUMERIC,
  weight INTEGER,
  age INTEGER,
  birth_date DATE,
  college TEXT,
  experience INTEGER DEFAULT 0,
  salary NUMERIC,
  is_active BOOLEAN DEFAULT true,
  is_rookie BOOLEAN DEFAULT false,
  is_injured BOOLEAN DEFAULT false,
  injury_status TEXT,
  average_minutes NUMERIC,
  average_points NUMERIC,
  average_rebounds NUMERIC,
  average_assists NUMERIC,
  external_id TEXT,
  espn_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  status TEXT DEFAULT 'Active'::text
);
ALTER TABLE players ADD CONSTRAINT players_external_id_key UNIQUE (external_id);
ALTER TABLE players ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);


CREATE TABLE IF NOT EXISTS players_canonical (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  team_id UUID,
  league TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE players_canonical ADD CONSTRAINT players_canonical_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);


CREATE TABLE IF NOT EXISTS prop_type_aliases (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  canonical_name TEXT NOT NULL,
  alias TEXT NOT NULL,
  sport TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE prop_type_aliases ADD CONSTRAINT prop_type_aliases_alias_key UNIQUE (alias);


CREATE TABLE IF NOT EXISTS prop_types (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sport TEXT NOT NULL,
  unit TEXT,
  is_over_under BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  canonical_name TEXT
);
ALTER TABLE prop_types ADD CONSTRAINT prop_types_name_key UNIQUE (name);


CREATE TABLE IF NOT EXISTS props (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID,
  team_id UUID,
  game_id TEXT,
  prop_type TEXT,
  line NUMERIC,
  odds TEXT,
  priority BOOLEAN DEFAULT false,
  side TEXT,
  source TEXT,
  best_odds_over TEXT,
  best_odds_under TEXT,
  books_over TEXT,
  books_under TEXT,
  conflict_key TEXT,
  ev_percent NUMERIC,
  hit_rate NUMERIC,
  matchup_grade NUMERIC,
  streak_factor NUMERIC,
  line_sensitivity NUMERIC,
  ai_prediction NUMERIC,
  statpedia_rating NUMERIC,
  hit_rate_l5 NUMERIC,
  hit_rate_l10 NUMERIC,
  hit_rate_l20 NUMERIC,
  streak_current INTEGER,
  h2h_hit_rate NUMERIC,
  matchup_rank INTEGER,
  historical_average NUMERIC,
  games_tracked INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
ALTER TABLE props ADD CONSTRAINT props_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE props ADD CONSTRAINT props_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS team_abbrev_map (
  league TEXT NOT NULL,
  api_abbrev TEXT NOT NULL,
  team_id UUID NOT NULL,
  canonical_abbrev TEXT,
  logo_url TEXT
);
ALTER TABLE team_abbrev_map ADD CONSTRAINT team_abbrev_map_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS teams (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL,
  name TEXT NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  city TEXT,
  full_name TEXT,
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
  win_percentage NUMERIC,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  abbrev VARCHAR(10)
);
ALTER TABLE teams ADD CONSTRAINT uq_teams_league_abbrev UNIQUE (league_id, abbreviation);
ALTER TABLE teams ADD CONSTRAINT teams_external_id_key UNIQUE (external_id);
ALTER TABLE teams ADD CONSTRAINT teams_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id);


CREATE TABLE IF NOT EXISTS user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth_user(id);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'moderator'::character varying, 'admin'::character varying, 'owner'::character varying])::text[])));
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE;


CREATE TABLE IF NOT EXISTS users (
  id INTEGER NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
