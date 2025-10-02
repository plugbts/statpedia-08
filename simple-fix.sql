-- Simple fix for API configuration
-- Copy and paste this in any SQL interface you can access

-- Check if api_config table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'api_config'
);

-- If the above returns 'false', create the table:
CREATE TABLE IF NOT EXISTS public.api_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the API key (this will work even if table exists)
INSERT INTO public.api_config (key, value, description) 
VALUES ('sportsgameodds_api_key', '"d5dc1f00bc42133550bc1605dd8f457f"', 'SportGameOdds API key')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Verify it worked
SELECT key, value, description FROM public.api_config WHERE key = 'sportsgameodds_api_key';
