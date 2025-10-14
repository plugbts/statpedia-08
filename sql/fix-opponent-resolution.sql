-- Fix Opponent Resolution Issues
-- This script addresses the missing or generic opponent data in player_game_logs

-- =====================================================
-- STEP 1: IDENTIFY OPPONENT RESOLUTION ISSUES
-- =====================================================

-- Check current state of opponent data
SELECT 
    'Opponent Resolution Analysis' as analysis_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN opponent IS NULL OR opponent = '' THEN 1 END) as null_empty_opponents,
    COUNT(CASE WHEN opponent = 'OPP' THEN 1 END) as generic_placeholders,
    COUNT(CASE WHEN opponent NOT IN ('OPP', '') AND opponent IS NOT NULL THEN 1 END) as valid_opponents,
    ROUND(
        COUNT(CASE WHEN opponent NOT IN ('OPP', '') AND opponent IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as percent_valid
FROM public.player_game_logs
WHERE season = 2025;

-- Show sample of problematic records
SELECT 
    player_id,
    player_name,
    team,
    opponent,
    prop_type,
    date,
    CASE 
        WHEN opponent IS NULL THEN 'NULL'
        WHEN opponent = '' THEN 'EMPTY'
        WHEN opponent = 'OPP' THEN 'GENERIC_PLACEHOLDER'
        ELSE 'VALID'
    END as opponent_status
FROM public.player_game_logs
WHERE (opponent IS NULL OR opponent = '' OR opponent = 'OPP')
  AND season = 2025
LIMIT 20;

-- =====================================================
-- STEP 2: CREATE TEAM MAPPING TABLE (if needed)
-- =====================================================

-- Create a team mapping table to resolve opponent abbreviations
CREATE TABLE IF NOT EXISTS public.team_mappings (
    id SERIAL PRIMARY KEY,
    team_abbr VARCHAR(8) NOT NULL UNIQUE,
    team_name VARCHAR(64) NOT NULL,
    league VARCHAR(8) NOT NULL DEFAULT 'NFL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert NFL team mappings (expand as needed)
INSERT INTO public.team_mappings (team_abbr, team_name, league) VALUES
-- AFC East
('BUF', 'Buffalo Bills', 'NFL'),
('MIA', 'Miami Dolphins', 'NFL'),
('NE', 'New England Patriots', 'NFL'),
('NYJ', 'New York Jets', 'NFL'),
-- AFC North
('BAL', 'Baltimore Ravens', 'NFL'),
('CIN', 'Cincinnati Bengals', 'NFL'),
('CLE', 'Cleveland Browns', 'NFL'),
('PIT', 'Pittsburgh Steelers', 'NFL'),
-- AFC South
('HOU', 'Houston Texans', 'NFL'),
('IND', 'Indianapolis Colts', 'NFL'),
('JAX', 'Jacksonville Jaguars', 'NFL'),
('TEN', 'Tennessee Titans', 'NFL'),
-- AFC West
('DEN', 'Denver Broncos', 'NFL'),
('KC', 'Kansas City Chiefs', 'NFL'),
('LV', 'Las Vegas Raiders', 'NFL'),
('LAC', 'Los Angeles Chargers', 'NFL'),
-- NFC East
('DAL', 'Dallas Cowboys', 'NFL'),
('NYG', 'New York Giants', 'NFL'),
('PHI', 'Philadelphia Eagles', 'NFL'),
('WAS', 'Washington Commanders', 'NFL'),
-- NFC North
('CHI', 'Chicago Bears', 'NFL'),
('DET', 'Detroit Lions', 'NFL'),
('GB', 'Green Bay Packers', 'NFL'),
('MIN', 'Minnesota Vikings', 'NFL'),
-- NFC South
('ATL', 'Atlanta Falcons', 'NFL'),
('CAR', 'Carolina Panthers', 'NFL'),
('NO', 'New Orleans Saints', 'NFL'),
('TB', 'Tampa Bay Buccaneers', 'NFL'),
-- NFC West
('ARI', 'Arizona Cardinals', 'NFL'),
('LAR', 'Los Angeles Rams', 'NFL'),
('SF', 'San Francisco 49ers', 'NFL'),
('SEA', 'Seattle Seahawks', 'NFL')
ON CONFLICT (team_abbr) DO UPDATE SET
    team_name = EXCLUDED.team_name,
    league = EXCLUDED.league;

-- =====================================================
-- STEP 3: CREATE OPPONENT RESOLUTION FUNCTION
-- =====================================================

-- Create function to resolve opponents based on game schedule
-- This is a simplified version - in reality, you'd need actual game schedule data
CREATE OR REPLACE FUNCTION public.resolve_opponents()
RETURNS TABLE(
    player_id VARCHAR(64),
    team VARCHAR(8),
    opponent VARCHAR(8),
    game_date DATE,
    resolution_method VARCHAR(32)
) AS $$
DECLARE
    game_log RECORD;
    resolved_opponent VARCHAR(8);
    resolution_method VARCHAR(32);
BEGIN
    -- For each game log with missing opponent
    FOR game_log IN
        SELECT DISTINCT
            pgl.player_id,
            pgl.team,
            pgl.date,
            pgl.opponent
        FROM public.player_game_logs pgl
        WHERE (pgl.opponent IS NULL OR pgl.opponent = '' OR pgl.opponent = 'OPP')
          AND pgl.season = 2025
        ORDER BY pgl.date DESC
    LOOP
        -- Try to find opponent from other games on the same date
        SELECT DISTINCT other.opponent
        INTO resolved_opponent
        FROM public.player_game_logs other
        WHERE other.date = game_log.date
          AND other.team != game_log.team
          AND other.opponent = game_log.team
          AND other.opponent IS NOT NULL
          AND other.opponent != ''
          AND other.opponent != 'OPP'
        LIMIT 1;
        
        IF resolved_opponent IS NOT NULL THEN
            resolution_method := 'cross_reference';
        ELSE
            -- Fallback: use a generic opponent
            resolved_opponent := 'OPP';
            resolution_method := 'fallback';
        END IF;
        
        -- Return the resolution
        RETURN QUERY SELECT 
            game_log.player_id,
            game_log.team,
            resolved_opponent,
            game_log.date,
            resolution_method;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: UPDATE MISSING OPPONENTS
-- =====================================================

-- Create function to update opponent data
CREATE OR REPLACE FUNCTION public.update_missing_opponents()
RETURNS VOID AS $$
DECLARE
    update_count INT := 0;
BEGIN
    -- Update records where opponent is NULL or empty
    UPDATE public.player_game_logs
    SET opponent = 'OPP'
    WHERE (opponent IS NULL OR opponent = '')
      AND season = 2025;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % records with NULL/empty opponents', update_count;
    
    -- Try to resolve some generic 'OPP' placeholders using cross-referencing
    -- This is a simplified approach - in practice, you'd need actual schedule data
    UPDATE public.player_game_logs pgl1
    SET opponent = pgl2.team
    FROM public.player_game_logs pgl2
    WHERE pgl1.opponent = 'OPP'
      AND pgl1.date = pgl2.date
      AND pgl1.team != pgl2.team
      AND pgl2.opponent = pgl1.team
      AND pgl2.opponent != 'OPP'
      AND pgl1.season = 2025;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Resolved % generic opponent placeholders', update_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: VERIFY OPPONENT RESOLUTION
-- =====================================================

-- Create function to verify opponent resolution
CREATE OR REPLACE FUNCTION public.verify_opponent_resolution()
RETURNS TABLE(
    metric VARCHAR(64),
    count INT,
    percentage FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN opponent IS NULL OR opponent = '' THEN 1 END) as null_empty,
            COUNT(CASE WHEN opponent = 'OPP' THEN 1 END) as generic,
            COUNT(CASE WHEN opponent NOT IN ('OPP', '') AND opponent IS NOT NULL THEN 1 END) as valid
        FROM public.player_game_logs
        WHERE season = 2025
    )
    SELECT 'Total Records'::VARCHAR(64), total::INT, 100.0::FLOAT FROM stats
    UNION ALL
    SELECT 'Valid Opponents'::VARCHAR(64), valid::INT, (valid * 100.0 / total)::FLOAT FROM stats
    UNION ALL
    SELECT 'Generic Placeholders'::VARCHAR(64), generic::INT, (generic * 100.0 / total)::FLOAT FROM stats
    UNION ALL
    SELECT 'Null/Empty'::VARCHAR(64), null_empty::INT, (null_empty * 100.0 / total)::FLOAT FROM stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- 1. Check current opponent resolution status:
SELECT * FROM public.verify_opponent_resolution();

-- 2. See sample problematic records:
SELECT 
    player_id,
    player_name,
    team,
    opponent,
    prop_type,
    date
FROM public.player_game_logs
WHERE (opponent IS NULL OR opponent = '' OR opponent = 'OPP')
  AND season = 2025
LIMIT 10;

-- 3. Test opponent resolution function:
SELECT * FROM public.resolve_opponents() LIMIT 10;

-- 4. Update missing opponents:
SELECT public.update_missing_opponents();

-- 5. Verify the fix:
SELECT * FROM public.verify_opponent_resolution();

-- 6. Check specific team opponent patterns:
SELECT 
    team,
    opponent,
    COUNT(*) as game_count
FROM public.player_game_logs
WHERE season = 2025
  AND opponent IS NOT NULL
  AND opponent != ''
  AND opponent != 'OPP'
GROUP BY team, opponent
ORDER BY team, game_count DESC;
*/
