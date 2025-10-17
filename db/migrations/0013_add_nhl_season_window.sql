-- 0013: Add NHL season window
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS end_date timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_code ON public.leagues(code);

-- Upsert NHL 2024-2025 season window
INSERT INTO public.leagues (id, code, name, start_date, end_date)
VALUES (gen_random_uuid(), 'NHL', 'National Hockey League', '2024-10-01'::timestamptz, '2025-06-30'::timestamptz)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  updated_at = now();
