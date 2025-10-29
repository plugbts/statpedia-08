-- Migration 0005: Prevent UNK and dash values at database level
-- This migration adds CHECK constraints to ensure data quality

-- 1) Add CHECK constraints to proplines table to prevent UNK and dash values
DO $$
BEGIN
  -- Check if the constraint already exists before adding it
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proplines_team_not_unk' 
    AND conrelid = 'public.proplines'::regclass
  ) THEN
    ALTER TABLE public.proplines 
    ADD CONSTRAINT proplines_team_not_unk 
    CHECK (team IS NOT NULL AND team != 'UNK' AND team != '-' AND trim(team) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proplines_opponent_not_unk' 
    AND conrelid = 'public.proplines'::regclass
  ) THEN
    ALTER TABLE public.proplines 
    ADD CONSTRAINT proplines_opponent_not_unk 
    CHECK (opponent IS NOT NULL AND opponent != 'UNK' AND opponent != '-' AND trim(opponent) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proplines_player_name_not_unk' 
    AND conrelid = 'public.proplines'::regclass
  ) THEN
    ALTER TABLE public.proplines 
    ADD CONSTRAINT proplines_player_name_not_unk 
    CHECK (player_name IS NOT NULL AND player_name != 'UNK' AND player_name != '-' AND trim(player_name) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proplines_home_team_not_unk' 
    AND conrelid = 'public.proplines'::regclass
  ) THEN
    ALTER TABLE public.proplines 
    ADD CONSTRAINT proplines_home_team_not_unk 
    CHECK (home_team IS NOT NULL AND home_team != 'UNK' AND home_team != '-' AND trim(home_team) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proplines_away_team_not_unk' 
    AND conrelid = 'public.proplines'::regclass
  ) THEN
    ALTER TABLE public.proplines 
    ADD CONSTRAINT proplines_away_team_not_unk 
    CHECK (away_team IS NOT NULL AND away_team != 'UNK' AND away_team != '-' AND trim(away_team) != '');
  END IF;
END$$;

-- 2) Add CHECK constraints to player_props columns where text is stored
-- Note: team_id and opponent_team_id are UUIDs with foreign keys, so they're already protected
-- But if there are any text columns like external_id, we should validate them
DO $$
BEGIN
  -- Ensure external_id is not UNK or dash if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_props' 
    AND column_name = 'external_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'player_props_external_id_valid' 
      AND conrelid = 'public.player_props'::regclass
    ) THEN
      ALTER TABLE public.player_props 
      ADD CONSTRAINT player_props_external_id_valid 
      CHECK (external_id IS NULL OR (external_id != 'UNK' AND external_id != '-' AND trim(external_id) != ''));
    END IF;
  END IF;

  -- Ensure sportsbook is not UNK or dash if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_props' 
    AND column_name = 'sportsbook'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'player_props_sportsbook_valid' 
      AND conrelid = 'public.player_props'::regclass
    ) THEN
      ALTER TABLE public.player_props 
      ADD CONSTRAINT player_props_sportsbook_valid 
      CHECK (sportsbook IS NULL OR (sportsbook != 'UNK' AND sportsbook != '-' AND trim(sportsbook) != ''));
    END IF;
  END IF;
END$$;

-- 3) Add CHECK constraints to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'players_full_name_not_unk' 
    AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players 
    ADD CONSTRAINT players_full_name_not_unk 
    CHECK (full_name IS NOT NULL AND full_name != 'UNK' AND full_name != '-' AND trim(full_name) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'players_first_name_not_unk' 
    AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players 
    ADD CONSTRAINT players_first_name_not_unk 
    CHECK (first_name IS NOT NULL AND first_name != 'UNK' AND first_name != '-' AND trim(first_name) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'players_last_name_not_unk' 
    AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players 
    ADD CONSTRAINT players_last_name_not_unk 
    CHECK (last_name IS NOT NULL AND last_name != 'UNK' AND last_name != '-' AND trim(last_name) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'players_external_id_valid' 
    AND conrelid = 'public.players'::regclass
  ) THEN
    ALTER TABLE public.players 
    ADD CONSTRAINT players_external_id_valid 
    CHECK (external_id IS NULL OR (external_id != 'UNK' AND external_id != '-' AND trim(external_id) != ''));
  END IF;
END$$;

-- 4) Add CHECK constraints to teams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'teams_name_not_unk' 
    AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams 
    ADD CONSTRAINT teams_name_not_unk 
    CHECK (name IS NOT NULL AND name != 'UNK' AND name != '-' AND trim(name) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'teams_abbreviation_not_unk' 
    AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams 
    ADD CONSTRAINT teams_abbreviation_not_unk 
    CHECK (abbreviation IS NOT NULL AND abbreviation != 'UNK' AND abbreviation != '-' AND trim(abbreviation) != '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'teams_external_id_valid' 
    AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams 
    ADD CONSTRAINT teams_external_id_valid 
    CHECK (external_id IS NULL OR (external_id != 'UNK' AND external_id != '-' AND trim(external_id) != ''));
  END IF;
END$$;

-- 5) Create a monitoring function that can be called to check for UNK values
CREATE OR REPLACE FUNCTION public.check_for_unk_values()
RETURNS TABLE(
  table_name TEXT,
  column_name TEXT,
  unk_count BIGINT,
  sample_ids TEXT[]
) AS $$
BEGIN
  -- Check proplines table
  RETURN QUERY
  SELECT 
    'proplines'::TEXT,
    'team'::TEXT,
    COUNT(*)::BIGINT,
    ARRAY_AGG(id::TEXT) FILTER (WHERE id IS NOT NULL)
  FROM public.proplines
  WHERE team = 'UNK' OR team = '-' OR trim(team) = ''
  HAVING COUNT(*) > 0;

  RETURN QUERY
  SELECT 
    'proplines'::TEXT,
    'opponent'::TEXT,
    COUNT(*)::BIGINT,
    ARRAY_AGG(id::TEXT) FILTER (WHERE id IS NOT NULL)
  FROM public.proplines
  WHERE opponent = 'UNK' OR opponent = '-' OR trim(opponent) = ''
  HAVING COUNT(*) > 0;

  RETURN QUERY
  SELECT 
    'proplines'::TEXT,
    'player_name'::TEXT,
    COUNT(*)::BIGINT,
    ARRAY_AGG(id::TEXT) FILTER (WHERE id IS NOT NULL)
  FROM public.proplines
  WHERE player_name = 'UNK' OR player_name = '-' OR trim(player_name) = ''
  HAVING COUNT(*) > 0;

  -- Check players table
  RETURN QUERY
  SELECT 
    'players'::TEXT,
    'full_name'::TEXT,
    COUNT(*)::BIGINT,
    ARRAY_AGG(id::TEXT) FILTER (WHERE id IS NOT NULL)
  FROM public.players
  WHERE full_name = 'UNK' OR full_name = '-' OR trim(full_name) = ''
  HAVING COUNT(*) > 0;

  -- Check teams table
  RETURN QUERY
  SELECT 
    'teams'::TEXT,
    'abbreviation'::TEXT,
    COUNT(*)::BIGINT,
    ARRAY_AGG(id::TEXT) FILTER (WHERE id IS NOT NULL)
  FROM public.teams
  WHERE abbreviation = 'UNK' OR abbreviation = '-' OR trim(abbreviation) = ''
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_for_unk_values() IS 'Checks all relevant tables for UNK, dash, or empty values. Returns results only if violations are found.';

-- 6) Create a function to validate data before insertion (for use in ingestion scripts)
CREATE OR REPLACE FUNCTION public.validate_propline_data(
  p_player_name TEXT,
  p_team TEXT,
  p_opponent TEXT,
  p_home_team TEXT,
  p_away_team TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if any required field is UNK, dash, or empty
  IF p_player_name IS NULL OR p_player_name = 'UNK' OR p_player_name = '-' OR trim(p_player_name) = '' THEN
    RAISE EXCEPTION 'Invalid player_name: %', p_player_name;
  END IF;

  IF p_team IS NULL OR p_team = 'UNK' OR p_team = '-' OR trim(p_team) = '' THEN
    RAISE EXCEPTION 'Invalid team: %', p_team;
  END IF;

  IF p_opponent IS NULL OR p_opponent = 'UNK' OR p_opponent = '-' OR trim(p_opponent) = '' THEN
    RAISE EXCEPTION 'Invalid opponent: %', p_opponent;
  END IF;

  IF p_home_team IS NULL OR p_home_team = 'UNK' OR p_home_team = '-' OR trim(p_home_team) = '' THEN
    RAISE EXCEPTION 'Invalid home_team: %', p_home_team;
  END IF;

  IF p_away_team IS NULL OR p_away_team = 'UNK' OR p_away_team = '-' OR trim(p_away_team) = '' THEN
    RAISE EXCEPTION 'Invalid away_team: %', p_away_team;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_propline_data IS 'Validates propline data before insertion. Raises exception if any field contains UNK, dash, or empty values.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 0005 completed: UNK prevention constraints added';
END$$;
