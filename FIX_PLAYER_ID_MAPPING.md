# Fix Player ID Mapping - Complete Solution

## 🎯 **Problem Identified:**

The overlap count is 15, but analytics only processes 2 records because:

1. **Existing data uses raw player IDs** instead of canonical IDs
2. **Player ID mapping is inconsistent** (props mapping missing team suffix)
3. **Data normalization SQL was never executed**

## ✅ **Solution Steps:**

### Step 1: Fix Player ID Mapping Function
The props mapping is creating `JAXON_SMITHNJIGBA-` instead of `JAXON_SMITHNJIGBA-UNK`.

### Step 2: Run Data Normalization SQL
Update existing data to use canonical player IDs.

### Step 3: Re-run Analytics
After normalization, analytics should process hundreds of records.

---

## 🔧 **Manual SQL Commands to Run in Supabase Dashboard:**

### 1. Fix Inconsistent Mappings
```sql
-- Fix props mappings that are missing the team suffix
UPDATE player_id_map 
SET canonical_player_id = canonical_player_id || 'UNK'
WHERE source = 'props' 
AND canonical_player_id LIKE '%-' 
AND canonical_player_id NOT LIKE '%-UNK';
```

### 2. Normalize Game Logs Player IDs
```sql
UPDATE playergamelogs g
SET player_id = m.canonical_player_id
FROM player_id_map m
WHERE m.source = 'logs' 
AND m.source_player_id = g.player_id
AND g.player_id != m.canonical_player_id;
```

### 3. Normalize Prop Lines Player IDs
```sql
UPDATE proplines p
SET player_id = m.canonical_player_id
FROM player_id_map m
WHERE m.source = 'props' 
AND m.source_player_id = p.player_id
AND p.player_id != m.canonical_player_id;
```

### 4. Verify Normalization Results
```sql
-- Check overlap count (should be much higher than 15)
SELECT COUNT(DISTINCT g.player_id) as overlap_count
FROM playergamelogs g
JOIN proplines p ON g.player_id = p.player_id;

-- Check specific player (should now match)
SELECT 
  'Game Logs' as source,
  COUNT(*) as records,
  player_id
FROM playergamelogs 
WHERE player_name ILIKE '%jaxon%'
GROUP BY player_id

UNION ALL

SELECT 
  'Prop Lines' as source,
  COUNT(*) as records,
  player_id
FROM proplines 
WHERE player_name ILIKE '%jaxon%'
GROUP BY player_id;
```

---

## 🎯 **Expected Results After Fix:**

| Metric | Before | After |
|--------|--------|-------|
| **Player Overlap** | 15 | Hundreds |
| **Analytics Records** | 2 | Hundreds |
| **JAXON SMITHNJIGBA** | Different IDs | Same canonical ID |
| **Data Consistency** | Raw IDs | Canonical IDs |

---

## 🚀 **Next Steps:**

1. **Run the SQL commands** in Supabase dashboard
2. **Verify overlap increases** significantly
3. **Run nightly job** to see improved analytics
4. **Monitor system** for consistent canonical IDs

The root cause is that the existing data was never normalized to use canonical player IDs. Once this is fixed, the analytics pipeline should process hundreds of records instead of just 2.
