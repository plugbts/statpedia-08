# NFL Backfill Monitor - Quick Reference

## What's Running

### Backfill Process
- **Process ID:** 69839
- **Command:** `tsx scripts/ingest-official-game-logs.ts NFL 30`
- **Log File:** `nfl-backfill.log`
- **Expected Runtime:** 1.5-2 hours remaining
- **Target:** ~90 games, ~14,000 stats

### Monitor Process
- **Script:** `monitor-backfill-completion.ts`
- **Check Interval:** Every 60 seconds
- **Notification:** macOS notification when complete or stalled

## Current Progress (as of last check)
- ✅ 616 stats extracted
- ✅ 4 games processed (Oct 2-5)
- ✅ 110 stats added in last 10 minutes
- 🔄 ~86 games remaining

## Quick Commands

### Check Progress Manually
```bash
tsx scripts/check-backfill-progress.ts
```

### View Live Log
```bash
tail -f nfl-backfill.log
```

### Check Backfill Process
```bash
ps aux | grep "tsx scripts/ingest-official-game-logs.ts NFL" | grep -v grep
```

### Check Monitor Process
```bash
ps aux | grep "monitor-backfill-completion" | grep -v grep
```

### Stop Everything (if needed)
```bash
# Stop backfill
pkill -f "ingest-official-game-logs.ts NFL"

# Stop monitor
pkill -f "monitor-backfill-completion"
```

## What Happens When Complete

### Automatic Notification
You'll receive a macOS notification with:
- ✅ Number of games processed
- ✅ Total stats extracted
- ✅ Next steps

### Next Steps (Manual)
1. **Run Enrichment Calculation:**
   ```bash
   tsx scripts/enrich-comprehensive.ts
   ```

2. **Verify Coverage:**
   ```bash
   # Check enriched_stats count (should go from 16 → 800+)
   tsx scripts/check-backfill-progress.ts
   ```

3. **Test Frontend:**
   - Open http://localhost:8080
   - Check NFL props show percentages instead of "—"

## Troubleshooting

### If Monitor Stops
```bash
# Restart monitor
tsx scripts/monitor-backfill-completion.ts
```

### If Backfill Appears Stalled
1. Check the log file: `tail -20 nfl-backfill.log`
2. Verify process is running: `ps aux | grep ingest-official-game-logs`
3. Check for errors in the log
4. If truly stalled, can restart: `VERBOSE=1 tsx scripts/ingest-official-game-logs.ts NFL 30`

### If Process Died
```bash
# Check how much progress was made
tsx scripts/check-backfill-progress.ts

# Restart if needed (will skip already-processed games)
VERBOSE=1 tsx scripts/ingest-official-game-logs.ts NFL 30 > nfl-backfill.log 2>&1 &
```

## Expected Timeline

- **Current:** ~4 games processed (616 stats)
- **Target:** ~90-100 games (14,000-16,000 stats)
- **Remaining:** ~86 games
- **ETA:** 1.5-2 hours

## Success Criteria

✅ **Minimum Success:**
- At least 80 games processed
- At least 12,000 stats extracted
- All stat types represented (Passing, Rushing, Receiving, Defensive, Kicking)

✅ **Full Success:**
- 90-100 games processed
- 14,000-16,000 stats extracted
- Date range covers Oct 2 - Nov 1, 2025

## Monitor Output Explained

```
[1:17:45 PM] 📊 Progress Update:
   Games: 85/90 (94%)           ← Games processed / target
   Stats: 13,450 / 14,000        ← Total stats / target
   Rate: 145 stats/min           ← Extraction speed
   ETA: ~4 minutes               ← Estimated time remaining
   Status: ✅ Running            ← Process status
```

## Notification Types

### Success ✅
"Complete! 94 games, 15,234 stats extracted"
→ Everything worked perfectly

### Stalled ⚠️
"Backfill appears stalled - no new stats in 9+ minutes"
→ Check log file for issues

### Failed ❌
"Backfill stopped! Only 12 games processed. Check logs."
→ Process crashed, needs investigation

## Notes

- Monitor checks every 60 seconds (not too frequent to avoid spam)
- Considers stalled if no new stats in 3 minutes
- Will notify after 3 consecutive stalls (9 minutes total)
- Automatically detects completion based on games/stats thresholds
- Safe to close terminal - both processes run in background
