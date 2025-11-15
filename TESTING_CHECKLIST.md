# 🧪 Testing Checklist - Debug Features

**Date:** November 12, 2025  
**Servers:**
- ✅ API: http://localhost:3001
- ✅ Frontend: http://localhost:8083

---

## 📋 Step-by-Step Testing Guide

### Step 1: Open Browser Console
1. Open Chrome/Firefox/Safari
2. Press **F12** or **Cmd+Option+I** (Mac)
3. Navigate to **Console** tab
4. Keep it open during testing

### Step 2: Navigate to Frontend
1. Go to: http://localhost:8083
2. Wait for page to load
3. Watch console for debug output

### Step 3: Look for Debug Markers
Check console for these 5 debug sections IN ORDER:

```
1. 🔍 [API_DEBUG] ===== API Response Received =====
   ↳ Confirms props fetched from API

2. 🔄 [TRANSFORM_DEBUG] Starting transformation
   ↳ Confirms props being transformed

3. 🔍 [ORDERED_PROPS_DEBUG] ===== Building orderedProps =====
   ↳ Confirms sorting/filtering working

4. 🔍 [COLUMN_VIEW_DEBUG] ===== Component rendered =====
   ↳ Confirms props reached render layer

5. 🔄 [NORMALIZE_DEBUG] Normalization complete
   ↳ Confirms safe fallbacks applied
```

### Step 4: Check Visual Debug Overlays
1. Scroll to first prop card
2. Look for **"🔍 Debug Data (Click to expand)"** at bottom
3. Click to expand
4. Review JSON data:
   - ✅ All fields should have values
   - ❌ Look for "❌ NULL" indicators
   - ✅ Arrays should have counts > 0

### Step 5: Verify Data Rendering
Check each column displays correctly:

- [ ] **Player** - Name and headshot visible
- [ ] **Team** - Logo displays (not "?")
- [ ] **Prop Type** - Readable text (e.g., "Passing Yards")
- [ ] **Line** - Number with 1 decimal (e.g., "261.5")
- [ ] **Odds** - American odds (e.g., "-110")
- [ ] **EV%** - Percentage with +/- (e.g., "+2.3%")
- [ ] **Streak** - W/L indicator (e.g., "3W") or "—"
- [ ] **Rating** - Circular progress (not blank)
- [ ] **Matchup** - Opponent abbr (e.g., "vs DEN")
- [ ] **H2H** - Percentage and ratio or "—"
- [ ] **2025** - Season stats or "—"
- [ ] **L5** - Last 5 games or "—"
- [ ] **L10** - Last 10 games or "—"
- [ ] **L20** - Last 20 games or "—"

---

## 🐛 Common Issues to Check

### Issue: Page Won't Load
**Check:**
1. Console for JavaScript errors
2. Network tab for failed requests
3. Service worker status (may be blocking)

**Debug Commands:**
```bash
# Check if frontend is responding
curl -I http://localhost:8083/

# Check API health
curl http://localhost:3001/health

# Check API props endpoint
curl "http://localhost:3001/api/props?sport=nfl&limit=3" | jq .
```

### Issue: No Console Logs Appearing
**Possible Causes:**
1. Console filter is set (clear filters)
2. JavaScript is disabled
3. Page hasn't loaded enough to execute code

**Solution:**
- Clear browser cache
- Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)

### Issue: Props Not Displaying
**Check Console For:**
```
❌ [API_DEBUG] NO PROPS RETURNED FROM API!
❌ [ORDERED_PROPS_DEBUG] No mixedProps available!
⚠️  Rating calc failed for <player>
⚠️  Analytics not available
```

**Debug:**
```bash
# Test API directly
curl "http://localhost:3001/api/props?sport=nfl&limit=5" | jq '.items | length'

# Should return: 5
```

### Issue: Team Logos Not Showing
**Check:**
1. Debug overlay shows `team: "UNK"`
2. Network tab shows 404s for ESPN CDN URLs
3. TeamLogo component showing "?" icon

**Solution:**
- Verify team abbreviations are valid
- Check ESPN CDN URLs: https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png

### Issue: Analytics Showing "—"
**Check:**
1. Debug overlay shows `hasAnalyticsData: false`
2. Console shows `[ANALYTICS_DEBUG] Analytics not available`
3. `gameLogsCount: 0` in debug overlay

**This is EXPECTED if:**
- Player has no historical data
- useSimpleAnalytics hook failed to load
- Player ID doesn't match database

**Not a bug - just means no stats available!**

---

## ✅ Success Criteria

When everything works, you should see:

### In Console:
```
✅ [API_DEBUG] 127 props received
✅ [API_DEBUG] First prop field check: No "❌ NULL" indicators
✅ [TRANSFORM_DEBUG] 127 props transformed
✅ [ORDERED_PROPS_DEBUG] 127 props ordered
✅ [COLUMN_VIEW_DEBUG] 127 props rendering
✅ [NORMALIZE_DEBUG] All fields populated
```

### In Browser:
- ✅ All props display in table
- ✅ Team logos visible (not "?")
- ✅ Player names visible
- ✅ Odds displaying correctly
- ✅ EV% showing with +/- prefix
- ✅ Ratings showing circular progress
- ✅ No blank cells (except "—" for missing analytics)

### In Debug Overlay:
```json
{
  "playerName": "Patrick Mahomes",  // ✅ Not "❌ NULL"
  "team": "KC",                     // ✅ Not "UNK" or "❌ NULL"
  "opponent": "DEN",                // ✅ Not "UNK" or "❌ NULL"
  "propType": "passing_yards",      // ✅ Not "Unknown"
  "line": 261.5,                    // ✅ Valid number
  "overOdds": -110,                 // ✅ Valid odds
  "hasGameLogs": true,              // ✅ True if available
  "gameLogsCount": 48,              // ✅ > 0 if available
  "hasAnalyticsData": true          // ✅ True if available
}
```

---

## 📸 Screenshot Checklist

Take screenshots of:
1. **Browser console** - Showing all 5 debug sections
2. **Props table** - Showing first 10 rows with all columns
3. **Debug overlay** - Expanded view of first prop
4. **Network tab** - Showing successful API call to `/api/props`

Share these with the team if issues persist!

---

## 🚀 Next Steps

Once testing is complete:

### If Everything Works:
1. Remove debug console logs (keep try/catch)
2. Remove visual debug overlays
3. Keep all null checks and fallbacks
4. Commit changes: `fix(frontend): add comprehensive null safety and debug logging`

### If Issues Found:
1. Document specific error messages
2. Share console screenshots
3. Check which debug section failed
4. Review that specific code section
5. Add more targeted logging if needed

---

**Ready to test!** Open http://localhost:8083 and follow the checklist! 🎉
