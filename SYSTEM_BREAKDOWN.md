# 🔍 COMPLETE BREAKDOWN: Player Prop Data System
## For Dummies - What's Actually Happening & Why It's Broken

---

## 📊 THE BIG PICTURE: What We're Trying to Do

**Goal:** Show players props with enriched statistics (L5, L10, L20, streaks, H2H, season avg)

**Reality:** Only 1.5% of props (16 out of 1090) have enrichment data showing

---

## 🗃️ THE DATABASE TABLES (The Data Sources)

### 1. **`player_props`** - The Main Props Table
- **What it stores:** Live betting props from SportsGameOdds API
- **Current data:** 1,090 active props
- **Key fields:**
  - `player_name`: "Josh Allen"
  - `prop_type`: **"Passing Yards"** ← VERBOSE NAME
  - `line`: 249.5
  - `team`, `opponent`, `game_date`
  - `best_over`, `best_under` (odds)

**Example Row:**
```
player_name: "Josh Allen"
prop_type: "Passing Yards"
line: 249.5
team: "Buffalo Bills"
opponent: "Miami Dolphins"
```

---

### 2. **`player_game_logs`** - Historical Game Data
- **What it stores:** Past game performances from official APIs (MLB, NBA, NHL, Soccer)
- **Current data:** 686,741 rows total
- **Key fields:**
  - `player_name`: "Josh Allen"
  - `stat_type`: **"Yards"** ← SIMPLE NAME (NOT "Passing Yards")
  - `value`: 250 (actual performance)
  - `game_date`, `season`, `opponent`

**Example Row:**
```
player_name: "Josh Allen"
stat_type: "Yards"          ← PROBLEM: Doesn't match "Passing Yards"
value: 250
opponent: "Miami Dolphins"
```

**🚨 CRITICAL ISSUE #1: NO NFL DATA**
- Despite having 860 NFL props, there are **ZERO NFL game logs**
- Why? `ingest-official-game-logs.ts` only extracts generic "Yards" instead of:
  - "Passing Yards"
  - "Rushing Yards"
  - "Receiving Yards"
- NFL extraction is **completely broken**

---

### 3. **`prop_type_aliases`** - The Translation Table
- **What it's supposed to do:** Map different prop type names together
- **Status:** ✅ Created and seeded with 100+ mappings
- **Example mappings:**
```
canonical_name: "passing_yards"
aliases: ["Passing Yards", "pass yards", "passing yds", "QB Pass Yards"]
```

**Purpose:** Bridge the gap between:
- API names: "Passing Yards" (verbose)
- Database names: "Yards" (simple)
- User-friendly names: "Pass Yds" (short)

---

### 4. **`player_enriched_stats`** - Pre-computed Analytics
- **What it stores:** Pre-calculated L5, L10, L20, streaks for specific prop bets
- **Current data:** Only 16 rows (was 104, then 8, now 16 - fluctuating)
- **Key fields:**
  - `player_id`, `prop_type`, `line`
  - `l5_hit_rate`, `l10_hit_rate`, `l20_hit_rate`
  - `current_streak`, `h2h_hit_rate`

**Example Row:**
```
player_name: "Shohei Ohtani"
prop_type: "Batting Stolenbases"
l5_hit_rate: 0.60 (60% hit rate last 5 games)
current_streak: 2 (2 wins in a row)
```

**🚨 CRITICAL ISSUE #2: ONLY 16 ROWS**
- Should have enrichment for most of 1,090 active props
- Current coverage: **1.5%** (16/1090)
- 978 props have **ZERO** enrichment data

---

### 5. **`player_analytics`** - Season-level Stats
- **What it stores:** Full season performance summaries
- **Current data:** 7,847 rows (7,766 for 2025 season)
- **Key fields:**
  - `player_id`, `prop_type`
  - `season_hit_rate`, `total_games`
  - `avg_value`, `median_value`

**Better coverage than enriched_stats but still has name matching issues**

---

## 🔗 THE VIEW: `v_props_list` - The Master Query

**Purpose:** Join everything together for the API

```sql
SELECT 
  pp.*,  -- All prop fields
  
  -- From player_enriched_stats (PES)
  COALESCE(pes.l5_hit_rate, 0) as l5,
  COALESCE(pes.l10_hit_rate, 0) as l10,
  COALESCE(pes.l20_hit_rate, 0) as l20,
  COALESCE(pes.current_streak, 0) as streak,
  COALESCE(pes.h2h_hit_rate, 0) as h2h_avg,
  
  -- From player_analytics (PA)
  COALESCE(pa.season_hit_rate, 0) as season_avg
  
FROM player_props pp
LEFT JOIN player_enriched_stats pes ON ...
LEFT JOIN player_analytics pa ON ...
```

**The Join Logic:**
```sql
-- Trying to match:
pp.player_name = pes.player_name
AND normalize_prop_type(pp.prop_type) = normalize_prop_type(pes.prop_type)
AND pp.line = pes.line
```

**🚨 CRITICAL ISSUE #3: JOIN FAILURES**
- Even with normalization, joins fail because:
  - Props table: "Passing Yards"
  - Enriched table: Has data for "Batting Stolenbases" but NOT "Passing Yards"
  - No NFL enrichment data exists to join!

---

## 🔄 THE DATA FLOW: Step-by-Step Journey

### **STEP 1: Props Ingestion** ✅ WORKING
```
SportsGameOdds API 
  → ingest-sgo-props.ts 
    → player_props table (1,090 rows)
```
**Status:** ✅ Working perfectly
- Fetches live props from SGO
- Stores with verbose names ("Passing Yards")

---

### **STEP 2: Game Logs Ingestion** ⚠️ PARTIALLY BROKEN
```
Official Stats APIs 
  → ingest-official-game-logs.ts
    → player_game_logs table (686K rows)
```

**MLB/NBA/NHL:** ✅ Working
- Successfully extracts: "Hits", "Points", "Goals", "Assists"

**NFL:** 🚨 BROKEN
- Only extracts: "Yards" (generic)
- Should extract: "Passing Yards", "Rushing Yards", "Receiving Yards"
- Result: **ZERO usable NFL game logs**

**Code Issue:**
```typescript
// Current (BROKEN):
stats: [{ stat_type: "Yards", value: 250 }]

// Should be (CORRECT):
stats: [
  { stat_type: "Passing Yards", value: 250 },
  { stat_type: "Passing TDs", value: 2 },
  { stat_type: "Interceptions", value: 1 }
]
```

---

### **STEP 3: Enrichment Calculation** 🚨 BROKEN
```
player_game_logs 
  → enrich-comprehensive.ts
    → player_enriched_stats table (16 rows only!)
```

**What it's supposed to do:**
1. For each active prop in `player_props`
2. Find matching game logs in `player_game_logs`
3. Calculate L5/L10/L20 hit rates
4. Calculate streaks (how many in a row over/under)
5. Calculate H2H (against specific opponent)
6. Store in `player_enriched_stats`

**Why it's failing:**
```
Looking for: player="Josh Allen" + prop_type="Passing Yards"
Game logs have: player="Josh Allen" + stat_type="Yards"
Aliases table says: "Passing Yards" → "passing_yards"
But game logs have: "Yards" (generic, no NFL-specific stats)
NO MATCH! → No enrichment calculated
```

**Result:** 
- MLB props: 15% working (3/20) - some prop types match
- NFL props: 0% working (0/860) - no specific stat types
- Total: 1.5% enrichment coverage

---

### **STEP 4: Analytics Calculation** ⚠️ PARTIALLY WORKING
```
player_game_logs
  → calculate-player-analytics.ts
    → player_analytics table (7,847 rows)
```

**Status:** Better than enriched_stats but still has NFL issues
- Season-level stats are broader, so more matches
- Still suffers from prop type name mismatches

---

### **STEP 5: View Query** ✅ STRUCTURE OK, DATA MISSING
```
v_props_list view
  → Joins player_props + enriched_stats + analytics
    → Returns COALESCE(value, 0) for all metrics
```

**Status:** View itself is fine, but joins return NULL because:
- No enriched_stats rows for NFL (860 props)
- Limited enriched_stats for MLB/NBA (230 props, only 16 with data)
- COALESCE(NULL, 0) → returns 0 → shows as "—" in UI

---

### **STEP 6: API Layer** ✅ WORKING NOW
```
Frontend → http://localhost:3001/api/props
  → api-server.ts (no auth required now!)
    → Query v_props_list
      → Return JSON with enrichment fields
```

**Status:** ✅ Fixed!
- Auth requirement removed
- Props now accessible
- Returns data, but enrichment fields are all 0 or NULL

---

### **STEP 7: Frontend Display** ⚠️ SHOWS DASHES
```
Frontend receives props data
  → player-props-column-view.tsx
    → Displays L5, L10, L20, streaks, H2H
      → All show "—" because values are 0 or NULL
```

**Status:** UI working, but showing "—" because backend has no enrichment data

---

## 🔥 THE ROOT CAUSES: Why Everything is F***ed

### **ROOT CAUSE #1: NFL Stats Extraction is Broken**
**Impact:** 860 out of 1,090 props (79%) affected

**Problem:**
- `ingest-official-game-logs.ts` doesn't properly parse NFL stat types
- Only extracts generic "Yards" instead of:
  - "Passing Yards"
  - "Rushing Yards"  
  - "Receiving Yards"
  - "Passing TDs"
  - "Receptions"
  - etc.

**Why this breaks everything:**
```
player_props: "Passing Yards"
     ↓ (tries to join)
player_game_logs: "Yards" (generic - NO MATCH!)
     ↓
player_enriched_stats: NO DATA CREATED
     ↓
v_props_list: Returns NULL/0
     ↓
Frontend: Shows "—"
```

---

### **ROOT CAUSE #2: Prop Type Name Mismatch**
**Impact:** Even MLB/NBA props failing

**The Three Name Formats:**
1. **API/Props Table:** "Passing Yards" (verbose)
2. **Game Logs:** "Yards" or "Pass Yards" or "passing_yards" (varies)
3. **Aliases:** "passing_yards" (canonical)

**The Problem:**
```
Props: "Batting Stolenbases"
Game logs: "Stolen Bases"
Aliases: Maps both to "stolen_bases"
BUT: Fuzzy matching doesn't always work
RESULT: Some matches, most fail
```

**Current Success Rate:**
- MLB: 15% (3/20 props) - "Batting Stolenbases", "Points", "Hits+Runs+RBI"
- NFL: 0% (0/860 props) - no NFL game logs at all
- Overall: 1.5% (16/1090 props)

---

### **ROOT CAUSE #3: Enrichment Script Not Re-run**
**Impact:** Even fixed data isn't being calculated

**Problem:**
- Made fixes to aliases, views, normalization
- But `enrich-comprehensive.ts` hasn't been re-run since changes
- Old enriched_stats data is stale (104 → 8 → 16 rows fluctuating)

**Why it matters:**
- Even if we fix NFL extraction today
- Enrichment won't show until we run the enrichment script
- Script needs to process all 1,090 props

---

## 📉 THE CURRENT STATE: By the Numbers

| Metric | Value | Status |
|--------|-------|--------|
| **Total Active Props** | 1,090 | ✅ |
| **NFL Props** | 860 (79%) | 🚨 No game logs |
| **MLB Props** | 230 (21%) | ⚠️ Partial |
| **Game Logs Total** | 686,741 | ✅ |
| **NFL Game Logs** | 0 | 🚨 **ZERO** |
| **MLB Game Logs** | ~400K | ✅ |
| **Enriched Stats Rows** | 16 | 🚨 **Should be 800+** |
| **Enrichment Coverage** | 1.5% | 🚨 **Should be 70%+** |
| **Props with Enrichment** | 16 | 🚨 |
| **Props WITHOUT Enrichment** | 1,074 | 🚨 **98.5%!** |

---

## 🎯 THE FIX PRIORITY: What to Do Now

### **PRIORITY 1: Fix NFL Stats Extraction** 🔴 CRITICAL
**File:** `scripts/ingest-official-game-logs.ts`

**What to fix:**
```typescript
// CURRENT (BROKEN):
const stats = [{
  stat_type: "Yards",
  value: playerData.yards
}];

// SHOULD BE:
const stats = [
  { stat_type: "Passing Yards", value: playerData.passing?.yards },
  { stat_type: "Passing TDs", value: playerData.passing?.touchdowns },
  { stat_type: "Rushing Yards", value: playerData.rushing?.yards },
  { stat_type: "Rushing TDs", value: playerData.rushing?.touchdowns },
  { stat_type: "Receiving Yards", value: playerData.receiving?.yards },
  { stat_type: "Receptions", value: playerData.receiving?.receptions },
  // etc...
];
```

**Estimated time:** 1-2 hours
**Impact:** Unlocks 860 NFL props (79% of all props)

---

### **PRIORITY 2: Re-ingest NFL Game Logs** 🔴 CRITICAL
**Script:** `scripts/backfill-ingestion-loop.js` (already exists)

**What to do:**
1. Fix extraction code (Priority 1)
2. Run backfill for last 30-60 days of NFL games
3. This will populate player_game_logs with proper NFL data

**Command:**
```bash
node scripts/backfill-ingestion-loop.js --league=nfl --days=30
```

**Estimated time:** 2-3 hours runtime
**Result:** 50K-100K new NFL game log rows

---

### **PRIORITY 3: Re-run Enrichment** 🟡 HIGH
**Script:** `scripts/enrich-comprehensive.ts`

**What to do:**
1. After NFL game logs are populated
2. Run enrichment for all active props
3. This will calculate L5/L10/L20/streaks/H2H

**Command:**
```bash
tsx scripts/enrich-comprehensive.ts
```

**Estimated time:** 10-15 minutes
**Result:** 800+ enriched_stats rows (from current 16)

---

### **PRIORITY 4: Improve Prop Type Matching** 🟢 MEDIUM
**Files:** 
- `scripts/enrich-comprehensive.ts`
- `src/utils/prop-normalization.ts`

**What to fix:**
- Better fuzzy matching algorithm
- Handle edge cases like "Hits+Runs+RBI" → "h_r_rbi"
- Add more aliases to prop_type_aliases table

**Estimated time:** 1-2 hours
**Impact:** Increases MLB/NBA coverage from 15% to 40%+

---

### **PRIORITY 5: Add Real-time Refresh** 🟢 LOW
**What to add:**
- Scheduled job to re-calculate enrichment daily
- Webhook to trigger on new game completion
- Cache invalidation for v_props_list

**Estimated time:** 2-3 hours
**Impact:** Keeps enrichment data fresh automatically

---

## 🧪 HOW TO TEST IF IT'S WORKING

### **Test 1: Check Game Logs**
```sql
-- Should return NFL game logs (currently returns 0)
SELECT COUNT(*), stat_type 
FROM player_game_logs 
WHERE player_name = 'Josh Allen'
  AND stat_type LIKE '%Passing%'
GROUP BY stat_type;

-- Expected:
-- stat_type: "Passing Yards", count: 10+
-- stat_type: "Passing TDs", count: 10+
```

### **Test 2: Check Enrichment**
```sql
-- Should return enriched stats for NFL props
SELECT COUNT(*) 
FROM player_enriched_stats 
WHERE prop_type LIKE '%Passing%';

-- Expected: 100+ rows (currently 0)
```

### **Test 3: Check View**
```sql
-- Should return non-zero enrichment values
SELECT player_name, prop_type, line, l5, l10, l20, streak
FROM v_props_list
WHERE sport = 'nfl'
  AND l5 > 0
LIMIT 10;

-- Expected: 10 rows with real data (currently 0)
```

### **Test 4: Check API**
```bash
curl "http://localhost:3001/api/props?sport=nfl&limit=5"
```

Expected response:
```json
{
  "player_name": "Josh Allen",
  "prop_type": "Passing Yards",
  "line": 249.5,
  "l5": 0.60,  // NOT 0!
  "l10": 0.70,  // NOT 0!
  "streak": 3,  // NOT 0!
  "h2h_avg": 0.55  // NOT 0!
}
```

### **Test 5: Check Frontend**
1. Open http://localhost:8080
2. Go to Player Props tab
3. Filter to NFL
4. Look at L5/L10/L20 columns
5. **Should show:** "60%" or "3/5" 
6. **Currently shows:** "—"

---

## 💡 THE SIMPLE EXPLANATION

**What we're trying to do:**
"Show me if Josh Allen usually goes OVER or UNDER 249.5 passing yards"

**What's happening:**
1. ✅ We have the prop: "Josh Allen - Passing Yards - 249.5"
2. 🚨 We DON'T have his past passing yards (NFL extraction broken)
3. 🚨 We CAN'T calculate if he usually goes over (no data to calculate from)
4. ❌ We SHOW "—" in the UI (no enrichment data)

**What needs to happen:**
1. Fix NFL extraction → Get Josh Allen's past passing yards
2. Run enrichment → Calculate "In last 10 games, went OVER 7 times (70%)"
3. UI shows → "L10: 70%" instead of "—"

**That's it.** Everything else is just plumbing to make that happen.

---

## 🎬 THE ACTION PLAN (What to Do Monday Morning)

### **Hour 1: Fix NFL Extraction**
- [ ] Open `scripts/ingest-official-game-logs.ts`
- [ ] Find the NFL parsing section
- [ ] Change from generic "Yards" to specific stat types
- [ ] Test with one game to verify

### **Hour 2-4: Backfill NFL Data**
- [ ] Run `backfill-ingestion-loop.js --league=nfl --days=30`
- [ ] Monitor progress
- [ ] Verify game logs are populated

### **Hour 5: Re-run Enrichment**
- [ ] Run `enrich-comprehensive.ts`
- [ ] Check that enriched_stats goes from 16 → 800+ rows
- [ ] Verify in database

### **Hour 6: Test Everything**
- [ ] Check API responses (should have real numbers)
- [ ] Check frontend (should show percentages)
- [ ] Celebrate 🎉

---

## 📝 SUMMARY: The One-Liner

**The Problem:** NFL stats extraction is broken (extracts "Yards" instead of "Passing Yards"), so we have no NFL game logs (0 out of 686K), so we can't calculate enrichment (16 out of 1,090 props), so the UI shows dashes for 98.5% of props.

**The Fix:** Fix NFL extraction, re-run ingestion, re-run enrichment.

**The Timeline:** 6 hours of focused work.

**The Result:** 70%+ enrichment coverage instead of 1.5%.

---

That's the complete breakdown. The good news? **It's fixable.** The bad news? **It won't fix itself.** 

Let me know when you're ready to start Priority 1! 🚀
