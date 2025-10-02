-- Update max props per request to show more props
INSERT INTO api_config (key, value, description) 
VALUES ('max_props_per_request', '500', 'Maximum number of props to return per API request')
ON CONFLICT (key) 
DO UPDATE SET value = '500', updated_at = NOW();

-- Verify the update
SELECT key, value FROM api_config WHERE key = 'max_props_per_request';
