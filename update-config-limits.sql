-- Update configuration to remove testing limits

-- Insert or update the max_props_per_request setting
INSERT INTO public.api_config (key, value, description) 
VALUES (
    'max_props_per_request', 
    '100',
    'Maximum number of props to return per API request'
)
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify the configuration
SELECT key, value, description 
FROM public.api_config 
WHERE key IN ('sportsgameodds_api_key', 'max_props_per_request')
ORDER BY key;
