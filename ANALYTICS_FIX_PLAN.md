# Analytics Fix Plan: L5, L20, H2H Display

## Current Status

✅ **Database**: 781/1090 props have analytics (l5, l10, l20, h2h_avg, season_avg)  
✅ **View**: `v_props_list` correctly returns analytics fields  
❌ **API**: Returns null for analytics fields even though view has data  
❌ **Frontend**: Not displaying analytics (likely because API returns null)

## Root Cause

The API query looks correct but is returning null for analytics. Possible issues:
1. API query execution error (silently caught)
2. Data type serialization issue (0 being converted to null)
3. API falling back to SGO instead of using DB

## Fix Steps

### Step 1: Verify API Query Execution ✅
- [x] Confirmed view has data: `SELECT l5, l10, l20 FROM v_props_list WHERE l5 IS NOT NULL` returns 781 rows
- [ ] Test API query directly in psql - **DONE: Query works**
- [ ] Check API server logs for errors
- [ ] Verify DATABASE_URL is set in API server process

### Step 2: Fix API Response ✅
The API query in `src/server/api-server.ts` line 691-704 looks correct:
```sql
SELECT ..., l5, l10, l20, h2h_avg, season_avg, ...
FROM public.v_props_list
```

**Action**: Verify API is actually executing this query and not falling back to SGO.

### Step 3: Fix Frontend Filtering
Location: `src/components/player-props/player-props-tab.tsx`

**Current**: Filters might be excluding props with l5=0 (treating 0 as "no data")

**Fix**: Update filtering logic to treat l5=0 as valid data (0% hit rate is valid):
```tsx
// Don't filter out props with l5=0 - that's valid data!
const filteredProps = allProps.filter(prop => {
  // Only filter out props where analytics are truly null/undefined
  return prop.l5 !== null && prop.l5 !== undefined;
});
```

### Step 4: Frontend Display Logic
Location: `src/components/player-props/player-props-column-view.tsx`

**Current**: Uses `useSimpleAnalytics` hook which might not be getting data from API

**Fix**: Ensure component reads analytics directly from prop object:
```tsx
const l5 = prop.l5 ?? analytics?.l5?.pct ?? 0;
const l10 = prop.l10 ?? analytics?.l10?.pct ?? 0;
const l20 = prop.l20 ?? analytics?.l20?.pct ?? 0;
const h2h = prop.h2h_avg ?? analytics?.h2h?.avg ?? null;
```

### Step 5: Test End-to-End
1. Verify API returns analytics: `curl "http://localhost:3001/api/props-list?limit=10" | jq '.items[0].l5'`
2. Check frontend receives data: Browser console logs
3. Verify display: Props should show L5, L20, H2H values

## Quick Test Commands

```bash
# 1. Check view has data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM v_props_list WHERE l5 IS NOT NULL;"

# 2. Test API query
psql $DATABASE_URL -c "SELECT l5, l10, l20, h2h_avg FROM v_props_list WHERE l5 IS NOT NULL LIMIT 5;"

# 3. Test API endpoint
curl "http://localhost:3001/api/props-list?limit=10" | jq '.items[] | {name: .full_name, l5, l10, h2h: .h2h_avg}'

# 4. Check frontend
# Open browser console and check if props have l5, l10, l20 fields
```

## Next Actions

1. **IMMEDIATE**: Restart API server with DATABASE_URL exported
2. **IMMEDIATE**: Test API endpoint to verify it returns analytics
3. **THEN**: Fix frontend filtering to not exclude l5=0
4. **THEN**: Update display logic to show analytics from API response
5. **FINAL**: Test end-to-end in browser



