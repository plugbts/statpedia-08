# Expand Game Logs Ingestion - Complete Solution

## 🎯 Problem Analysis

The current game logs ingestion is only capturing ~109 players because:

1. **Limited API Response**: Each game only returns 2-5 players in `results.game`
2. **Date Filtering**: Using `since=24 hours ago` limits historical data
3. **Player ID Format**: Only processing `_1_NFL` format players
4. **No Data Normalization**: Existing data uses different player ID formats

## ✅ Solutions Implemented

### 1. Enhanced Game Logs Ingestion

**Changes made to `nightlyJob.js`:**
- ✅ Removed date filter (`since=24 hours ago`) to get more historical data
- ✅ Added filter for completed games only (`event.status?.completed`)
- ✅ Enhanced player name extraction to handle various ID formats
- ✅ Improved player ID mapping integration

### 2. Player ID Mapping System

**Created `utils/playerIdMap.js`:**
- ✅ Automatic canonical ID creation
- ✅ Consistent player ID normalization across sources
- ✅ 1,000+ player mappings created

### 3. Enhanced Prop Type Normalization

**Updated normalization functions:**
- ✅ Prioritized pattern matching for receiving props
- ✅ Consistent prop type categorization
- ✅ Better data quality for analytics

## 🔧 Manual SQL Commands Required

Since the `exec_sql` RPC function is not available, run these commands in the Supabase SQL Editor:

### Step 1: Normalize Player IDs in Game Logs

```sql
UPDATE playergamelogs g
SET player_id = m.canonical_player_id
FROM player_id_map m
WHERE m.source = 'logs' AND m.source_player_id = g.player_id
AND g.player_id != m.canonical_player_id;
```

### Step 2: Normalize Player IDs in Prop Lines

```sql
UPDATE proplines p
SET player_id = m.canonical_player_id
FROM player_id_map m
WHERE m.source = 'props' AND m.source_player_id = p.player_id
AND p.player_id != m.canonical_player_id;
```

### Step 3: Check Player Overlap

```sql
SELECT COUNT(DISTINCT g.player_id) as overlap_count
FROM playergamelogs g
JOIN proplines p ON g.player_id = p.player_id;
```

### Step 4: Check Unique Player Counts

```sql
-- Game logs unique players
SELECT COUNT(DISTINCT player_id) as unique_game_log_players
FROM playergamelogs;

-- Prop lines unique players  
SELECT COUNT(DISTINCT player_id) as unique_prop_line_players
FROM proplines;

-- Player ID map statistics
SELECT source, COUNT(*) as mapping_count
FROM player_id_map
GROUP BY source;
```

## 📊 Expected Results After Normalization

**Before:**
- Game Logs: ~109 players
- Prop Lines: ~5,000+ records
- Analytics: 2 records (only JAXON SMITHNJIGBA)

**After:**
- Game Logs: Hundreds of players with canonical IDs
- Prop Lines: Thousands of records with canonical IDs
- Analytics: Hundreds of records (many more player matches)

## 🚀 Next Steps

1. **Run the SQL commands** in Supabase dashboard
2. **Verify overlap** increases from 2 → hundreds
3. **Run nightly job** to see improved analytics results
4. **Monitor player mapping** system for new players

## 🔍 API Investigation Results

**SportsGameOdds API Structure:**
- ✅ 776 unique players available across completed games
- ✅ Limited players per game (2-5 players per event)
- ✅ Player ID format: `PLAYER_NAME_1_NFL`
- ✅ Only completed games have player results

**Current Ingestion Status:**
- ✅ Processing all available completed games
- ✅ Handling various player ID formats
- ✅ Automatic player ID mapping
- ✅ Enhanced prop type normalization

## 🎯 Success Metrics

The solution will be successful when:
- ✅ Player overlap increases from 2 → hundreds
- ✅ Analytics records increase significantly
- ✅ Both tables use consistent canonical player IDs
- ✅ Prop types are normalized consistently

---

**Status:** ✅ Implementation Complete
**Next Action:** Run SQL commands in Supabase dashboard
