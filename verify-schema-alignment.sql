-- Verify Schema Alignment
-- Run this after applying schema-alignment-migration.sql to confirm alignment

-- ✅ Check proplines table structure
SELECT 
    'proplines' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'proplines' 
    AND table_schema = 'public'
    AND column_name IN ('player_id', 'player_name', 'team', 'opponent', 'season', 'date', 
                       'prop_type', 'line', 'over_odds', 'under_odds', 'sportsbook', 
                       'league', 'game_id', 'conflict_key', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- ✅ Check player_game_logs table structure  
SELECT 
    'player_game_logs' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'player_game_logs' 
    AND table_schema = 'public'
    AND column_name IN ('player_id', 'player_name', 'team', 'opponent', 'season', 'date',
                       'prop_type', 'value', 'sport', 'league', 'game_id', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- ✅ Check indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('proplines', 'player_game_logs')
    AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ✅ Test insert capability (should succeed after schema alignment)
-- This is a test query - actual inserts will be done by Worker
SELECT 'Schema alignment verification complete' as status;
