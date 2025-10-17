-- 0005: Enhance team_abbrev_map with canonical_abbrev/logo_url and seed NFL/NBA
-- Safe, idempotent operations

-- 1) Add columns if missing
ALTER TABLE public.team_abbrev_map
  ADD COLUMN IF NOT EXISTS canonical_abbrev TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2) Backfill canonical_abbrev from teams table
UPDATE public.team_abbrev_map m
SET canonical_abbrev = (
  SELECT t.abbreviation FROM public.teams t WHERE t.id = m.team_id
)
WHERE m.canonical_abbrev IS NULL;

-- 3) Seed logo URLs for NFL and NBA using ESPN CDN patterns
UPDATE public.team_abbrev_map m
SET logo_url = CASE
  WHEN m.league = 'NFL' THEN 'https://a.espncdn.com/i/teamlogos/nfl/500/' || lower((SELECT t.abbreviation FROM public.teams t WHERE t.id = m.team_id)) || '.png'
  WHEN m.league = 'NBA' THEN 'https://a.espncdn.com/i/teamlogos/nba/500/' || lower((SELECT t.abbreviation FROM public.teams t WHERE t.id = m.team_id)) || '.png'
  ELSE m.logo_url
END
WHERE m.league IN ('NFL','NBA') AND (m.logo_url IS NULL OR m.logo_url = '');

-- 4) Optional: also backfill teams.logo_url from mapping when missing
UPDATE public.teams t
SET logo_url = (
  SELECT m.logo_url FROM public.team_abbrev_map m WHERE m.team_id = t.id AND m.logo_url IS NOT NULL LIMIT 1
)
FROM public.leagues l
WHERE t.logo_url IS NULL AND l.id = t.league_id AND l.code IN ('NFL','NBA')
  AND EXISTS (SELECT 1 FROM public.team_abbrev_map m WHERE m.team_id = t.id AND m.logo_url IS NOT NULL);

-- 5) Quick validation summary
-- SELECT league, COUNT(*) AS rows, COUNT(logo_url) AS with_logos FROM public.team_abbrev_map GROUP BY league ORDER BY league;
