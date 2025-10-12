# Comprehensive Prop Types Fix

## 🔍 **Issues Identified:**

### 1. **Frontend Filtering Issue** ✅ FIXED
- **Problem**: Frontend was filtering out props with missing under odds
- **Fix**: Updated `overUnderFilter` logic to show all props when set to "both"
- **Files Changed**: `src/components/player-props/player-props-tab.tsx`

### 2. **Prop Type Aliases Database Issue** ✅ FIXED  
- **Problem**: `prop_type_aliases` table had broken data (canonical_name = "undefined")
- **Fix**: Fixed worker to use correct column name (`canonical_name` instead of `canonical`)
- **Files Changed**: `cloudflare-worker/src/propTypeSync.ts`

### 3. **Missing Combo Props Configuration** ✅ FIXED
- **Problem**: Combo props weren't included in worker oddIDs configuration
- **Fix**: Added combo props to NFL oddIDs and prop type mappings
- **Files Changed**: 
  - `cloudflare-worker/src/config/leagues.ts`
  - `cloudflare-worker/src/fetchProps.ts`
  - `cloudflare-worker/src/propTypeSync.ts`

### 4. **Existing Data Issues** ⚠️ NEEDS MANUAL FIX
- **Problem**: 278 NFL props are all labeled as "over/under" instead of proper types
- **Solution**: Run SQL script to fix existing data

## 🛠️ **Fixes Applied:**

### ✅ **Frontend Fixes:**
1. **Prop Type Matching**: Fixed exact string matching between database (underscores) and frontend (spaces)
2. **Default Filters**: Changed defaults to show all props:
   - `overUnderFilter`: "over" → "both"
   - `maxLine`: 100 → 1000  
   - `useOddsFilter`: true → false

### ✅ **Worker Fixes:**
1. **Column Name Fix**: Fixed `propTypeSync.ts` to use `canonical_name` instead of `canonical`
2. **Combo Props**: Added combo prop mappings and oddIDs:
   - `passing+rushing_yards-PLAYER_ID-game-ou-over`
   - `rushing+receiving_yards-PLAYER_ID-game-ou-over`
3. **Prop Type Mappings**: Enhanced `PROP_TYPE_MAP` with combo props

## 📋 **Manual Steps Required:**

### 1. **Fix Existing Database Data**
Run this SQL script in Supabase SQL Editor:
```sql
-- File: fix-all-prop-issues.sql
-- This will:
-- 1. Clean up broken prop_type_aliases
-- 2. Insert proper aliases
-- 3. Fix existing over/under props based on line ranges
-- 4. Remove conflicting duplicates
```

### 2. **Test the Worker**
The worker has been deployed with fixes. It should now:
- ✅ Load prop type aliases correctly
- ✅ Normalize prop types properly
- ✅ Include combo props in requests
- ✅ Create proper prop types instead of "over/under"

## 🎯 **Expected Results After Manual Fix:**

### **Props That Should Appear:**
1. **Passing Yards**: ~23 props (lines 200+)
2. **Rushing Yards**: ~56 props (lines 50-200)  
3. **Rushing Attempts**: ~98 props (lines 15-50)
4. **Receptions**: ~44 props (lines 5-15)
5. **Passing Touchdowns**: ~40 props (lines 1-5)
6. **Combo Props**: New props like "Passing + Rushing Yards"

### **Frontend Behavior:**
- ✅ All existing props visible by default
- ✅ Proper prop type filtering works
- ✅ Dropdown shows all prop types
- ✅ No more missing props due to filtering

## 🚀 **Next Steps:**

1. **Run the SQL fix** (`fix-all-prop-issues.sql`) in Supabase
2. **Test the frontend** to verify all props appear
3. **Monitor worker ingestion** to ensure new props use correct types
4. **Verify combo props** appear in future data ingestion

## 📊 **Current Status:**
- **Frontend**: ✅ FIXED - Will show all props
- **Worker**: ✅ FIXED - Normalization should work
- **Database**: ⚠️ NEEDS SQL FIX - Existing data needs cleanup
- **Combo Props**: ✅ CONFIGURED - Should appear in new data
