-- Align core schema to Drizzle definitions used by ingestion
-- Safe, idempotent: only creates tables/columns/indexes if missing.

-- Extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS name text;
-- Some branches define extra columns; add if missing but keep them nullable to avoid insert failures
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS abbreviation text;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS sport text;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_code ON leagues(code);
-- If abbreviation exists with NOT NULL, relax it to allow inserts from ingestion that only set code/name
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leagues' AND column_name = 'abbreviation'
  ) THEN
    BEGIN
      ALTER TABLE leagues ALTER COLUMN abbreviation DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      -- ignore if column state differs
      NULL;
    END;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leagues' AND column_name = 'sport'
  ) THEN
    BEGIN
      ALTER TABLE leagues ALTER COLUMN sport DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leagues' AND column_name = 'season'
  ) THEN
    BEGIN
      ALTER TABLE leagues ALTER COLUMN season DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;
END $$;

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league_id uuid;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS abbreviation text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url text;
-- Additional columns that may exist in alternate schemas; keep nullable to avoid insert failures
ALTER TABLE teams ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'teams' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'teams_league_id_fkey'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
  END IF;
  -- Relax NOT NULL constraints on optional columns if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'city'
  ) THEN
    BEGIN
      ALTER TABLE teams ALTER COLUMN city DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL; END;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'full_name'
  ) THEN
    BEGIN
      ALTER TABLE teams ALTER COLUMN full_name DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL; END;
  END IF;
END $$;

-- Players
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE players ADD COLUMN IF NOT EXISTS team_id uuid;
ALTER TABLE players ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE players ADD COLUMN IF NOT EXISTS external_id text;
-- Additional columns from alternate schema; keep nullable
ALTER TABLE players ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS position_category text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'players' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'players_team_id_fkey'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
  -- Relax NOT NULL constraints on columns that ingestion doesn't populate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'first_name'
  ) THEN BEGIN
    ALTER TABLE players ALTER COLUMN first_name DROP NOT NULL;
  EXCEPTION WHEN undefined_column THEN NULL; END; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'last_name'
  ) THEN BEGIN
    ALTER TABLE players ALTER COLUMN last_name DROP NOT NULL;
  EXCEPTION WHEN undefined_column THEN NULL; END; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'full_name'
  ) THEN BEGIN
    ALTER TABLE players ALTER COLUMN full_name DROP NOT NULL;
  EXCEPTION WHEN undefined_column THEN NULL; END; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'position'
  ) THEN BEGIN
    ALTER TABLE players ALTER COLUMN position DROP NOT NULL;
  EXCEPTION WHEN undefined_column THEN NULL; END; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'position_category'
  ) THEN BEGIN
    ALTER TABLE players ALTER COLUMN position_category DROP NOT NULL;
  EXCEPTION WHEN undefined_column THEN NULL; END; END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id);

-- Props (sportsbook)
CREATE TABLE IF NOT EXISTS props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE props ADD COLUMN IF NOT EXISTS player_id uuid;
ALTER TABLE props ADD COLUMN IF NOT EXISTS team_id uuid;
ALTER TABLE props ADD COLUMN IF NOT EXISTS game_id text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS prop_type text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS line numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS odds text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS priority boolean DEFAULT false;
ALTER TABLE props ADD COLUMN IF NOT EXISTS side text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS best_odds_over text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS best_odds_under text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS books_over text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS books_under text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS conflict_key text;
ALTER TABLE props ADD COLUMN IF NOT EXISTS ev_percent numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS hit_rate numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS matchup_grade numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS streak_factor numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS line_sensitivity numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS ai_prediction numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS statpedia_rating numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS hit_rate_l5 numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS hit_rate_l10 numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS hit_rate_l20 numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS streak_current integer;
ALTER TABLE props ADD COLUMN IF NOT EXISTS h2h_hit_rate numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS matchup_rank integer;
ALTER TABLE props ADD COLUMN IF NOT EXISTS historical_average numeric;
ALTER TABLE props ADD COLUMN IF NOT EXISTS games_tracked integer DEFAULT 0;
ALTER TABLE props ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE props ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'props' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'props_player_id_fkey'
  ) THEN
    ALTER TABLE props
      ADD CONSTRAINT props_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'props' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'props_team_id_fkey'
  ) THEN
    ALTER TABLE props
      ADD CONSTRAINT props_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure props.conflict_key has a unique index for upserts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'props' AND indexname = 'props_conflict_key_key'
  ) THEN
    CREATE UNIQUE INDEX props_conflict_key_key ON props(conflict_key);
  END IF;
END $$;

-- Games
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE games ADD COLUMN IF NOT EXISTS league_id uuid;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_team_id uuid;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_team_id uuid;
ALTER TABLE games ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS season_type text DEFAULT 'regular';
ALTER TABLE games ADD COLUMN IF NOT EXISTS week integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_date date;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_time text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_date_time timestamp;
ALTER TABLE games ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';
ALTER TABLE games ADD COLUMN IF NOT EXISTS venue text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS attendance integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS weather text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score_q1 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score_q2 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score_q3 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score_q4 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_score_ot integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score_q1 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score_q2 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score_q3 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score_q4 integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_score_ot integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_points integer;
ALTER TABLE games ADD COLUMN IF NOT EXISTS home_team_spread numeric;
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_over_under numeric;
ALTER TABLE games ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS api_game_id text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_id text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE games ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_external_id ON games(external_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_api_game_id ON games(api_game_id);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'games' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'games_league_id_fkey'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'games' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'games_home_team_id_fkey'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'games' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'games_away_team_id_fkey'
  ) THEN
    ALTER TABLE games ADD CONSTRAINT games_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Pickem Props
CREATE TABLE IF NOT EXISTS pickem_props (
  id serial PRIMARY KEY
);
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS player_id uuid;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS team_id uuid;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS game_id text;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS prop_type text;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS line numeric;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS pickem_site text;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS over_projection numeric;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS under_projection numeric;
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
ALTER TABLE pickem_props ADD COLUMN IF NOT EXISTS conflict_key text;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'pickem_props' AND constraint_type = 'UNIQUE' AND constraint_name = 'pickem_props_conflict_key_key'
  ) THEN
    ALTER TABLE pickem_props ADD CONSTRAINT pickem_props_conflict_key_key UNIQUE (conflict_key);
  END IF;
END $$;
