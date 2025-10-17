-- 0010: Seed season windows for major leagues (approximate current/last seasons)
-- Idempotent upserts based on league code where available; falls back to name where only name exists.

-- Ensure leagues table has code/start_date/end_date columns
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS end_date timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_code ON public.leagues(code);

-- Helper: upsert by code if present else by name
WITH payload(code, name, season_start, season_end) AS (
  VALUES
    ('NBA', 'National Basketball Association', '2024-10-01', '2025-06-30'),
    ('NFL', 'National Football League',      '2024-09-01', '2025-02-28'),
    ('MLB', 'Major League Baseball',         '2025-03-01', '2025-11-15'),
    ('WNBA','Women''s National Basketball Association','2025-05-01','2025-10-31')
)
INSERT INTO public.leagues (id, code, name, start_date, end_date)
SELECT COALESCE(l.id, gen_random_uuid()), p.code, COALESCE(p.name, l.name), p.season_start::timestamptz, p.season_end::timestamptz
FROM payload p
LEFT JOIN public.leagues l ON (l.code IS NOT NULL AND l.code = p.code) OR (l.code IS NULL AND l.name = p.name)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  updated_at = now();

-- If rows existed without code but with matching name, ensure code is set
UPDATE public.leagues l
SET code = p.code,
    start_date = p.season_start::timestamptz,
    end_date = p.season_end::timestamptz,
    updated_at = now()
FROM (
  VALUES
    ('NBA', 'National Basketball Association', '2024-10-01', '2025-06-30'),
    ('NFL', 'National Football League',      '2024-09-01', '2025-02-28'),
    ('MLB', 'Major League Baseball',         '2025-03-01', '2025-11-15'),
    ('WNBA','Women''s National Basketball Association','2025-05-01','2025-10-31')
) AS p(code, name, season_start, season_end)
WHERE l.code IS NULL AND l.name = p.name;
