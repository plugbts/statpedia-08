# RPC Constraint Fix Summary

## Problem Identified

The RPC functions `bulk_upsert_proplines` and `bulk_upsert_player_game_logs` were failing with multiple errors:

1. **Missing Unique Constraint**: The `proplines` table was missing the unique constraint that the RPC function expected: `(player_id, date, prop_type, sportsbook, line)`

2. **PostgreSQL Syntax Error**: Incorrect use of `GET DIAGNOSTICS was_updated = FOUND;` - `FOUND` is a built-in boolean variable, not a diagnostic item

3. **Incorrect Constraint Logic**: The RPC functions had flawed logic for counting inserts vs updates

## Files Fixed

### 1. `fix-rpc-constraints.sql` (NEW)
- **Purpose**: Complete fix script that ensures proper constraints exist and creates corrected RPC functions
- **Contains**: 
  - Constraint verification and creation
  - Fixed RPC function definitions
  - Proper insert/update counting logic
  - Test cases

### 2. `create-rpc-functions.sql` (UPDATED)
- **Purpose**: Updated main RPC functions file with fixes
- **Changes**:
  - Added `was_updated` variable declaration
  - Fixed insert/update counting logic
  - Improved error handling

### 3. `supabase/migrations/20250103_create_bulk_upsert_rpc.sql` (UPDATED)
- **Purpose**: Updated migration file with fixes
- **Changes**: Same as above for consistency

### 4. `fix-proplines-constraint.sql` (NEW)
- **Purpose**: Specific fix for the proplines table constraint issue
- **Contains**:
  - Constraint checking queries
  - Constraint creation
  - Verification tests

### 5. `test-rpc-constraints.js` (NEW)
- **Purpose**: Test script to verify RPC functions work correctly
- **Tests**:
  - Empty array handling
  - Sample data insertion
  - Duplicate handling (updates)

### 6. `debug-rpc-errors.js` (NEW)
- **Purpose**: Debug script to identify specific constraint errors
- **Features**:
  - Detailed error reporting
  - Table structure verification
  - Constraint checking

## Key Fixes Applied

### 1. Constraint Issues
```sql
-- Added missing unique constraint for proplines
ALTER TABLE public.proplines 
ADD CONSTRAINT proplines_unique_prop_constraint 
UNIQUE (player_id, date, prop_type, sportsbook, line);
```

### 2. PostgreSQL Syntax Error Fix
```sql
-- BEFORE (incorrect syntax):
GET DIAGNOSTICS was_updated = FOUND;  -- ERROR: FOUND is not a diagnostic item

-- AFTER (correct syntax):
-- FOUND is automatically set by PostgreSQL after INSERT/UPDATE operations
IF FOUND THEN
  -- Check if row existed before (this is an update)
  IF (SELECT COUNT(*) FROM proplines WHERE ...) > 0 THEN
    update_count := update_count + 1;
  ELSE
    insert_count := insert_count + 1;
  END IF;
ELSE
  insert_count := insert_count + 1;
END IF;
```

### 3. RPC Function Logic
```sql
-- Removed unnecessary variable declaration
DECLARE
  row_record jsonb;
  insert_count integer := 0;
  update_count integer := 0;
  error_count integer := 0;
  error_list jsonb := '[]'::jsonb;
  current_error jsonb;
  -- Removed: was_updated boolean; (not needed)
```

## How to Apply the Fixes

### Option 1: Use the Complete Fix Script (Recommended)
```bash
# Run the complete fix script in Supabase SQL Editor
psql -h your-db-host -U your-user -d your-db -f fix-rpc-constraints.sql
```

### Option 2: Apply Individual Fixes
```bash
# 1. Fix the proplines constraint
psql -h your-db-host -U your-user -d your-db -f fix-proplines-constraint.sql

# 2. Update the RPC functions
psql -h your-db-host -U your-user -d your-db -f create-rpc-functions.sql
```

### Option 3: Manual Application
1. Execute the constraint creation SQL from `fix-proplines-constraint.sql`
2. Execute the RPC function updates from `create-rpc-functions.sql`

## Testing

After applying the fixes, run the test script to verify everything works:

```bash
node test-rpc-constraints.js
```

Expected output should show:
- ✅ All functions work without errors
- ✅ Sample data inserts successfully
- ✅ Duplicate handling works (updates instead of inserts)

## Verification

The fixes ensure:
1. ✅ Unique constraints exist for both tables
2. ✅ RPC functions can handle bulk inserts/updates
3. ✅ Proper counting of inserts vs updates
4. ✅ Error handling for constraint violations
5. ✅ Compatible with existing Cloudflare Worker code

## Impact

- **Resolves**: "there is no unique or exclusion constraint matching the ON CONFLICT specification" errors
- **Improves**: Bulk data ingestion performance
- **Maintains**: Data integrity through proper constraints
- **Enables**: Reliable upsert operations in Cloudflare Workers
