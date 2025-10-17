-- Ensure unique key for teams per league on (league_id, abbreviation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'teams' AND c.conname = 'uq_teams_league_abbrev'
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT uq_teams_league_abbrev UNIQUE (league_id, abbreviation);
  END IF;
END $$;
