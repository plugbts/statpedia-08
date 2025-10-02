-- Debug Database Issue - Check what's causing the JSON error

-- Step 1: Check if api_config table already exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'api_config'
ORDER BY ordinal_position;

-- Step 2: Check all tables that might have JSON columns
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE data_type IN ('json', 'jsonb')
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Step 3: Check if there are any existing rows in api_config
SELECT COUNT(*) as row_count FROM public.api_config WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'api_config'
);

-- Step 4: Show existing data in api_config if it exists
SELECT * FROM public.api_config WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'api_config'
) LIMIT 5;
