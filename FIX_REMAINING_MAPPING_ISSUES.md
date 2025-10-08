# Fix Remaining Player ID Mapping Issues

## 🎯 **Current Status:**
- **Overlap improved**: 15 → 18 ✅
- **Game logs**: Using canonical IDs (`JAXON_SMITHNJIGBA-UNK`) ✅
- **Some prop lines**: Using canonical IDs ✅
- **Some prop lines**: Still using incomplete IDs (`JAXON_SMITHNJIGBA-`) ❌

## 🔧 **Additional SQL Commands to Run:**

### 1. Fix Remaining Incomplete Canonical IDs
```sql
-- Fix prop lines that have incomplete canonical IDs (ending with just '-')
UPDATE proplines 
SET player_id = player_id || 'UNK'
WHERE player_id LIKE '%-' 
AND player_id NOT LIKE '%-UNK';
```

### 2. Fix NBA Player IDs (they have _1_NBA- format)
```sql
-- Fix NBA players that have _1_NBA- format
UPDATE proplines 
SET player_id = REPLACE(player_id, '_1_NBA-', '-UNK')
WHERE player_id LIKE '%_1_NBA-%';
```

### 3. Update Player ID Map for NBA Players
```sql
-- Update player_id_map for NBA players to use consistent format
UPDATE player_id_map 
SET canonical_player_id = REPLACE(canonical_player_id, '_1_NBA-', '-UNK')
WHERE canonical_player_id LIKE '%_1_NBA-%';
```

### 4. Re-run Prop Lines Normalization
```sql
-- Re-run the normalization for any remaining unmapped players
UPDATE proplines p
SET player_id = m.canonical_player_id
FROM player_id_map m
WHERE m.source = 'props' 
AND m.source_player_id = p.player_id
AND p.player_id != m.canonical_player_id;
```

### 5. Final Verification
```sql
-- Check the overlap count again (should be much higher than 18)
SELECT COUNT(DISTINCT g.player_id) as overlap_count
FROM playergamelogs g
JOIN proplines p ON g.player_id = p.player_id;

-- Check JAXON SMITHNJIGBA specifically
SELECT 
  'Game Logs' as source,
  player_id,
  COUNT(*) as records
FROM playergamelogs 
WHERE player_name ILIKE '%jaxon%'
GROUP BY player_id

UNION ALL

SELECT 
  'Prop Lines' as source,
  player_id,
  COUNT(*) as records
FROM proplines 
WHERE player_name ILIKE '%jaxon%'
GROUP BY player_id;
```

## 🎯 **Expected Results:**
- **Overlap count**: Should increase from 18 to hundreds
- **JAXON SMITHNJIGBA**: Should have matching IDs in both tables
- **Analytics**: Should process hundreds of records instead of 2

## 🚀 **Next Steps:**
1. Run these additional SQL commands
2. Check overlap count again
3. Run nightly job to see improved analytics results
