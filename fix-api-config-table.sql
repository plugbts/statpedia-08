-- Create API config table and set up SportsGameOdds API key
-- This will fix the SportsGameOdds API integration

-- Create the api_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_config (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_config_key ON public.api_config(key);

-- Insert the SportsGameOdds API key
INSERT INTO public.api_config (key, value, description) 
VALUES ('sportsgameodds_api_key', '"d5dc1f00bc42133550bc1605dd8f457f"', 'SportGameOdds API key')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Insert other necessary config values
INSERT INTO public.api_config (key, value, description) 
VALUES 
    ('cache_ttl_seconds', '300', 'Cache TTL in seconds'),
    ('polling_interval_seconds', '60', 'Polling interval in seconds'),
    ('rate_limit_per_minute', '100', 'Rate limit per minute'),
    ('max_props_per_request', '50', 'Maximum props per request'),
    ('enabled_sports', '["nfl", "nba", "mlb", "nhl"]', 'Enabled sports list')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.api_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.api_config TO anon;

-- Enable RLS
ALTER TABLE public.api_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read api config" ON public.api_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage api config" ON public.api_config
    FOR ALL USING (auth.role() = 'service_role');

-- Verify the setup
SELECT key, LEFT(value, 10) || '...' as value_preview, description 
FROM public.api_config 
WHERE key = 'sportsgameodds_api_key';
