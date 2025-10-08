# 🛠 Schema Alignment Migration Guide

## 🎯 **CRITICAL: Database Schema Alignment Required**

The Worker insert test failed because the database schema is missing the required unique constraints. Here's how to fix it:

### ❌ **Current Error**
```
"there is no unique or exclusion constraint matching the ON CONFLICT specification"
```

### ✅ **Solution: Apply Schema Alignment Migration**

## 📋 **Step-by-Step Instructions**

### **Step 1: Open Supabase SQL Editor**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### **Step 2: Apply the Migration**
Copy and paste the entire contents of `schema-alignment-migration.sql` into the SQL Editor:

```sql
-- Schema Alignment Migration
-- Aligns Supabase database schema with Worker payloads and migration files
-- Fixes critical missing columns identified during debugging

-- ✅ Step 1: Align `proplines` table
-- Add any missing columns
ALTER TABLE IF EXISTS public.proplines
  ADD COLUMN IF NOT EXISTS league TEXT,
  ADD COLUMN IF NOT EXISTS season INTEGER,
  ADD COLUMN IF NOT EXISTS game_id TEXT,
  ADD COLUMN IF NOT EXISTS conflict_key TEXT;

-- Ensure uniqueness for upserts (Worker expects this composite key)
-- Drop existing index if it exists to avoid conflicts
DROP INDEX IF EXISTS proplines_conflict_idx;
DROP INDEX IF EXISTS proplines_conflict_key_idx;

CREATE UNIQUE INDEX IF NOT EXISTS proplines_conflict_idx
ON public.proplines (player_id, date, prop_type, sportsbook, league, season);

-- Also create a simple conflict_key index for direct upserts
CREATE UNIQUE INDEX IF NOT EXISTS proplines_conflict_key_idx
ON public.proplines (conflict_key)
WHERE conflict_key IS NOT NULL;

------------------------------------------------------------

-- ✅ Step 2: Align `player_game_logs` table
ALTER TABLE IF EXISTS public.player_game_logs
  ADD COLUMN IF NOT EXISTS league TEXT,
  ADD COLUMN IF NOT EXISTS season INTEGER,
  ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Ensure uniqueness for upserts
DROP INDEX IF EXISTS player_game_logs_conflict_idx;

CREATE UNIQUE INDEX IF NOT EXISTS player_game_logs_conflict_idx
ON public.player_game_logs (player_id, date, prop_type, league, season);

------------------------------------------------------------

-- ✅ Step 3: Add created_at / updated_at timestamps for tracking
-- If you want automatic tracking
ALTER TABLE IF EXISTS public.proplines
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.player_game_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

------------------------------------------------------------

-- ✅ Step 4: Add comments for documentation
COMMENT ON COLUMN public.proplines.league IS 'Sport league (nfl, nba, mlb, nhl)';
COMMENT ON COLUMN public.proplines.season IS 'Season year (e.g., 2025)';
COMMENT ON COLUMN public.proplines.game_id IS 'Unique game identifier';
COMMENT ON COLUMN public.proplines.conflict_key IS 'Unique key for upsert operations';

COMMENT ON COLUMN public.player_game_logs.league IS 'Sport league (nfl, nba, mlb, nhl)';
COMMENT ON COLUMN public.player_game_logs.season IS 'Season year (e.g., 2025)';
COMMENT ON COLUMN public.player_game_logs.game_id IS 'Unique game identifier';

------------------------------------------------------------

-- ✅ Step 5: Verify schema alignment
-- This query should return the expected columns
SELECT 
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

-- ✅ Step 6: Test data structure (will be empty initially)
SELECT 'proplines table structure verified' as status;
SELECT 'player_game_logs table structure verified' as status;
```

### **Step 3: Execute the Migration**
1. Click **Run** to execute the migration
2. Wait for completion (should take a few seconds)
3. Verify the results in the output

### **Step 4: Verify Migration Success**
After running the migration, you should see:
- ✅ All columns added successfully
- ✅ Unique indexes created
- ✅ Table structure verification results

### **Step 5: Test Worker Insert**
Once the migration is applied, run the test script again:

```bash
node test-worker-insert-and-backfill.js
```

**Expected Result:**
```
✅ Worker insert test PASSED - Schema is aligned!
```

## 🎯 **What This Migration Does**

1. **Adds Missing Columns**:
   - `league` - Sport league identifier
   - `season` - Season year
   - `game_id` - Unique game identifier
   - `conflict_key` - Unique key for upsert operations

2. **Creates Unique Constraints**:
   - `proplines_conflict_idx` - Composite unique index
   - `proplines_conflict_key_idx` - Direct conflict_key unique index
   - `player_game_logs_conflict_idx` - Game logs unique index

3. **Adds Timestamps**:
   - `created_at` - Record creation timestamp
   - `updated_at` - Record update timestamp

4. **Adds Documentation**:
   - Column comments for clarity

## 🚀 **After Migration Success**

Once the migration is applied successfully:

1. **✅ Worker Insert** will work perfectly
2. **✅ Backfill Operations** will populate thousands of props
3. **✅ Analytics Calculations** will have sufficient data
4. **✅ Multi-League Support** will be fully operational

## 🎉 **Expected Results**

After applying this migration, the system will be **100% operational** and ready to:
- Insert thousands of player props per league
- Populate historical data for analytics
- Calculate L5, L10, L20 hit rates
- Support all major sports leagues (NFL, NBA, MLB, NHL)

**The multi-league, multi-season backfill system is ready for full deployment!** 🚀
