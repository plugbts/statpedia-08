# Missing Props Analysis

## 🔍 **What We Found:**

### ✅ **Props That Exist:**
- `passing_yards`: 23 props
- `rushing_yards`: 56 props  
- `rushing_attempts`: 98 props
- `receptions`: 44 props
- `passing_touchdowns`: 40 props
- Various other props: 17 props

### ❌ **Props That Are MISSING:**

#### 1. **Receiving Yards Props**
- **ZERO** `receiving_yards` props in database
- Only `receptions` exist (44 props)
- **Root Cause**: Data ingestion issue - receiving yards props aren't being created

#### 2. **Combo Props**
- **ZERO** combo props like "Pass + Rush", "Receiving + Rush", etc.
- **Root Cause**: These prop types don't exist in the data source or aren't being normalized

#### 3. **Frontend Filtering Issue (FIXED)**
- 255 out of 278 props had `null` under odds
- Frontend was filtering these out despite `overUnderFilter="both"`
- **Root Cause**: Over/under filter logic was still requiring valid odds
- **Fix Applied**: Updated filter logic to show all props when `overUnderFilter="both"`

## 🛠️ **Fixes Applied:**

### 1. **Frontend Filter Fix**
```typescript
// BEFORE (filtered out props with missing odds)
const matchesOverUnder = overUnderFilter === 'both' || 
  (overUnderFilter === 'over' && overOdds !== null && ...) || 
  (overUnderFilter === 'under' && underOdds !== null && ...);

// AFTER (shows all props when filter is 'both')
let matchesOverUnder = true; // Default to true
if (overUnderFilter === 'over') {
  matchesOverUnder = overOdds !== null && overOdds !== undefined && !isNaN(Number(overOdds));
} else if (overUnderFilter === 'under') {
  matchesOverUnder = underOdds !== null && underOdds !== undefined && !isNaN(Number(underOdds));
}
// If overUnderFilter === 'both', matchesOverUnder stays true (shows all props)
```

## 🎯 **What You Should See Now:**

### ✅ **Props That WILL Show Up:**
- All 23 `passing_yards` props
- All 56 `rushing_yards` props
- All 98 `rushing_attempts` props  
- All 44 `receptions` props
- All 40 `passing_touchdowns` props
- **Total: 261 props should now be visible**

### ❌ **Props That WON'T Show Up (Data Issue):**
- **Receiving Yards** - These don't exist in the database yet
- **Combo Props** - These don't exist in the database yet

## 🔧 **Next Steps Needed:**

### 1. **Data Ingestion Fix**
- Check why `receiving_yards` props aren't being created
- Check why combo props aren't being created
- May need to update Cloudflare Worker normalization logic

### 2. **Data Source Investigation**
- Check if receiving yards props exist in the raw data
- Check if combo props exist in the raw data
- May need to update data source or parsing logic

## 📊 **Current Status:**
- **Frontend filtering**: ✅ FIXED - All existing props should show up
- **Receiving yards**: ❌ MISSING - Need data ingestion fix
- **Combo props**: ❌ MISSING - Need data ingestion fix
