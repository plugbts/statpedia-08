-- Step 2: Seed Leagues Data
-- Insert major sports leagues

INSERT INTO leagues (code, name) VALUES
  ('NFL', 'National Football League'),
  ('NBA', 'National Basketball Association'),
  ('MLB', 'Major League Baseball'),
  ('WNBA', 'Women''s National Basketball Association'),
  ('NHL', 'National Hockey League'),
  ('CBB', 'College Basketball')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();
