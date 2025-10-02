-- Minimal API Key Fix - Just create the config table and insert the key
-- This avoids any JSON parsing issues

-- Step 1: Create ONLY the api_config table
CREATE TABLE IF NOT EXISTS public.api_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert the API key (delete first if exists to avoid conflicts)
DELETE FROM public.api_config WHERE key = 'sportsgameodds_api_key';

INSERT INTO public.api_config (key, value, description) 
VALUES (
    'sportsgameodds_api_key', 
    'd5dc1f00bc42133550bc1605dd8f457f',
    'API key for SportGameOdds service'
);

-- Step 3: Verify it worked
SELECT key, LEFT(value, 8) || '...' || RIGHT(value, 4) as api_key_preview, description 
FROM public.api_config 
WHERE key = 'sportsgameodds_api_key';
