-- Fix API configuration for SportGameOdds API key
-- Run this in Supabase SQL Editor if API key is missing

-- First, check if api_config table exists and has data
SELECT * FROM public.api_config WHERE key = 'sportsgameodds_api_key';

-- If no results, insert the API key
INSERT INTO public.api_config (key, value, description) VALUES
('sportsgameodds_api_key', '"d5dc1f00bc42133550bc1605dd8f457f"', 'SportGameOdds API key')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Also ensure other required config exists
INSERT INTO public.api_config (key, value, description) VALUES
('cache_ttl_seconds', '30', 'Default cache TTL in seconds'),
('polling_interval_seconds', '30', 'Background polling interval in seconds'),
('rate_limit_per_minute', '60', 'Default rate limit per user per minute'),
('max_props_per_request', '3', 'Maximum props returned per request for testing'),
('enabled_sports', '["nfl", "nba", "mlb", "nhl"]', 'List of enabled sports for polling')
ON CONFLICT (key) DO NOTHING;

-- Verify the configuration
SELECT key, value, description, updated_at FROM public.api_config ORDER BY key;
