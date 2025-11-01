# Sports Data Pipeline Skill

**Domain:** Multi-league sports data ingestion, enrichment, and analytics

**Purpose:** Guide development of scripts and systems that fetch, process, and analyze player statistics across NFL, NBA, MLB, NHL, and WNBA.

---

## When to Use This Skill

Use this skill when working on:
- **Ingestion scripts** that fetch game logs from ESPN or other sources
- **Enrichment scripts** that calculate analytics (hit rates, streaks, averages)
- **Backfill jobs** that populate historical data for multiple seasons
- **Monitoring systems** for production data pipelines
- **League-specific extraction** logic for different sports APIs

**File triggers:**
- `scripts/ingest*.ts`
- `scripts/backfill*.ts`
- `scripts/enrich*.ts`
- `scripts/*-ingestion*.ts`
- `scripts/production-guardrails.ts`

**Keyword triggers:** "ingest", "backfill", "enrichment", "pipeline", "ESPN", "league", "game logs"

---

## Core Principles

### 1. **Pagination & Rate Limiting**
Always implement proper pagination and rate limiting to avoid API limits and ensure complete data coverage.

### 2. **League-Specific Extraction**
Each league (NFL, NBA, MLB, NHL, WNBA) has unique API structures. Use league-specific extraction logic with explicit stat type mappings.

### 3. **Error Recovery**
Pipeline scripts must be resilient to API failures, network issues, and data inconsistencies. Always implement retry logic and progress tracking.

### 4. **Idempotent Operations**
All ingestion and enrichment operations should be safe to re-run. Use upsert patterns and check for existing data.

### 5. **Production Observability**
Monitor ingestion metrics, track progress, log errors, and provide clear status updates for long-running jobs.

---

## Key Patterns

### Pattern 1: Paginated ESPN API Ingestion
```typescript
// Always use pagination for complete coverage
async function fetchSchedule(league: League, dateStr: string) {
  // Fetch schedule for date
  const games = await getScheduleForDate(league, dateStr);
  
  for (const game of games) {
    try {
      // Fetch detailed game data with retries
      const boxscore = await fetchWithRetry(
        `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${game.gameId}`
      );
      
      // Extract stats using league-specific logic
      const stats = await extractStats(league, boxscore);
      
      // Store with upsert to handle duplicates
      await upsertGameLogs(stats);
      
    } catch (error) {
      console.error(`Failed game ${game.gameId}:`, error);
      // Continue with next game - don't fail entire batch
    }
  }
}
```

### Pattern 2: League-Specific Stat Extraction
```typescript
// Map ESPN stat labels to your prop_type strings
const NFL_STAT_MAPPINGS = {
  'Passing Yards': 'Passing Yards',
  'Completions/Attempts': 'Pass Completions',
  'Passing Touchdowns': 'Passing TDs',
  'Interceptions': 'Interceptions',
  'Rushing Yards': 'Rushing Yards',
  'Rushing Attempts': 'Rush Attempts',
  'Rushing Touchdowns': 'Rushing TDs',
  'Receptions': 'Receptions',
  'Receiving Yards': 'Receiving Yards',
  'Receiving Touchdowns': 'Receiving TDs',
  // ... more mappings
};

async function extractNFLStats(boxscore: any) {
  const players = boxscore.boxscore?.players || [];
  const stats: StatRecord[] = [];
  
  for (const team of players) {
    for (const player of team.statistics || []) {
      const { athlete, stats: athleteStats, labels } = player;
      
      // Map each label to its value using parallel arrays
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const value = athleteStats[i];
        const propType = NFL_STAT_MAPPINGS[label];
        
        if (propType && value) {
          stats.push({
            player_name: athlete.displayName,
            prop_type: propType,
            stat_value: parseStatValue(value),
            // ...
          });
        }
      }
    }
  }
  
  return stats;
}
```

### Pattern 3: Season-Level Analytics Enrichment
```typescript
// Compute season averages and hit rates
async function enrichPlayerAnalytics(playerId: UUID, propType: string, season: string) {
  // Fetch all game logs for this player/prop/season
  const logs = await db.execute(sql`
    SELECT stat_value, game_date
    FROM player_game_logs
    WHERE player_id = ${playerId}
      AND prop_type = ${propType}
      AND EXTRACT(YEAR FROM game_date)::text = ${season}
    ORDER BY game_date ASC
  `);
  
  if (logs.length === 0) return;
  
  // Calculate season average
  const values = logs.map(l => l.stat_value);
  const season_avg = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Calculate L5/L10 averages
  const last5 = values.slice(-5);
  const last10 = values.slice(-10);
  const l5_avg = last5.length ? last5.reduce((a, b) => a + b) / last5.length : null;
  const l10_avg = last10.length ? last10.reduce((a, b) => a + b) / last10.length : null;
  
  // Upsert analytics record
  await db.execute(sql`
    INSERT INTO player_analytics (player_id, prop_type, season, season_avg, l5_avg, l10_avg, games_played)
    VALUES (${playerId}, ${propType}, ${season}, ${season_avg}, ${l5_avg}, ${l10_avg}, ${logs.length})
    ON CONFLICT (player_id, prop_type, season)
    DO UPDATE SET
      season_avg = EXCLUDED.season_avg,
      l5_avg = EXCLUDED.l5_avg,
      l10_avg = EXCLUDED.l10_avg,
      games_played = EXCLUDED.games_played,
      updated_at = NOW()
  `);
}
```

### Pattern 4: Date Range Backfill
```typescript
// Backfill data for a date range
async function ingestRange(league: League, startDate: string, endDate: string) {
  const dates = generateDateRange(startDate, endDate);
  
  console.log(`[${league}] Backfilling ${dates.length} days from ${startDate} to ${endDate}`);
  
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  
  for (const date of dates) {
    try {
      const stats = await fetchAndExtractForDate(league, date);
      inserted += await upsertBatch(stats);
      processed++;
      
      // Progress update every 10 days
      if (processed % 10 === 0) {
        console.log(`[${league}] Progress: ${processed}/${dates.length} days, ${inserted} stats inserted`);
      }
      
      // Rate limiting - don't hammer APIs
      await sleep(200);
      
    } catch (error) {
      console.error(`[${league}] Failed on ${date}:`, error);
      errors++;
      // Continue with next date
    }
  }
  
  console.log(`[${league}] Complete: ${processed} days, ${inserted} stats, ${errors} errors`);
}
```

### Pattern 5: Production Guardrails
```typescript
// Monitoring and safety checks
class ProductionGuardrails {
  async logIngestionMetrics(metrics: IngestionMetrics) {
    console.log(`🔄 Ingestion: ${metrics.inserted} inserted, ${metrics.failed} failed, ${metrics.duration}ms`);
    
    // Store in database for historical tracking
    await db.execute(sql`
      INSERT INTO ingestion_logs (inserted, failed, skipped, duration_ms, created_at)
      VALUES (${metrics.inserted}, ${metrics.failed}, ${metrics.skipped}, ${metrics.duration}, NOW())
    `);
    
    // Alert if failure rate is high
    const failureRate = metrics.failed / (metrics.inserted + metrics.failed);
    if (failureRate > 0.1) {
      console.warn(`⚠️ High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }
  }
  
  async checkIngestionHealth() {
    // Verify recent ingestion activity
    const recentLogs = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM player_game_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    if (recentLogs[0].count === 0) {
      console.error('❌ No ingestion activity in last 24 hours!');
      return false;
    }
    
    return true;
  }
}
```

---

## Resource Files

For detailed patterns and examples:
- **[Ingestion Patterns](./resources/ingestion-patterns.md)** - ESPN API structure, pagination, extraction
- **[Enrichment Patterns](./resources/enrichment-patterns.md)** - Analytics calculations, hit rates, streaks
- **[Backfill Patterns](./resources/backfill-patterns.md)** - Date range handling, multi-league coordination
- **[Monitoring Patterns](./resources/monitoring-patterns.md)** - Observability, logging, notifications

---

## Common Mistakes to Avoid

### ❌ DON'T: Fetch without pagination
```typescript
// BAD: Will miss data if there are more than default page size
const games = await fetch(`/api/schedule?date=${date}`);
```

✅ **DO: Always paginate**
```typescript
// GOOD: Fetch all pages until no more data
let cursor = null;
do {
  const page = await fetch(`/api/schedule?date=${date}&cursor=${cursor || ''}`);
  games.push(...page.data);
  cursor = page.nextCursor;
} while (cursor);
```

### ❌ DON'T: Use generic "Yards" for all leagues
```typescript
// BAD: Loses sport-specific context
stats.push({ prop_type: 'Yards', value: yardage });
```

✅ **DO: Use specific prop types per league**
```typescript
// GOOD: Explicit stat type
if (league === 'NFL') {
  stats.push({ prop_type: 'Rushing Yards', value: rushingYards });
  stats.push({ prop_type: 'Receiving Yards', value: receivingYards });
}
```

### ❌ DON'T: Fail entire batch on one error
```typescript
// BAD: One bad game stops everything
for (const game of games) {
  const stats = await extractStats(game); // throws on error
  await insert(stats);
}
```

✅ **DO: Continue on individual failures**
```typescript
// GOOD: Log error but continue
for (const game of games) {
  try {
    const stats = await extractStats(game);
    await insert(stats);
  } catch (error) {
    console.error(`Failed game ${game.id}:`, error);
    // Continue with next game
  }
}
```

### ❌ DON'T: Ignore progress tracking
```typescript
// BAD: No visibility into long-running jobs
await ingestAllGames(games);
```

✅ **DO: Provide progress updates**
```typescript
// GOOD: Clear progress visibility
let processed = 0;
for (const game of games) {
  await ingestGame(game);
  processed++;
  if (processed % 10 === 0) {
    console.log(`Progress: ${processed}/${games.length} games`);
  }
}
```

---

## Quick Reference

### Ingestion Checklist
- [ ] Pagination implemented
- [ ] Rate limiting (200-500ms between requests)
- [ ] Retry logic for failed requests
- [ ] League-specific stat extraction
- [ ] Upsert to handle duplicates
- [ ] Progress tracking and logging
- [ ] Error handling per game/batch

### Enrichment Checklist
- [ ] Season-level aggregation
- [ ] Rolling window calculations (L5, L10)
- [ ] Hit rate formulas (requires line data)
- [ ] Streak detection
- [ ] Upsert on conflict
- [ ] Batch processing for large datasets

### Backfill Checklist
- [ ] Date range generation
- [ ] Multi-league coordination
- [ ] Incremental progress saving
- [ ] Resumability on failure
- [ ] Verification queries post-run
- [ ] Notifications on completion

---

## Testing Patterns

### Test Single Game Extraction
```typescript
// Validate extraction logic on a single game
const gameId = '401671720'; // Known game
const boxscore = await fetchESPN(`/summary?event=${gameId}`);
const stats = await extractNFLStats(boxscore);

console.log(`Extracted ${stats.length} stats`);
console.log('Sample:', stats.slice(0, 3));

// Verify specific stat types are present
const propTypes = [...new Set(stats.map(s => s.prop_type))];
console.log('Prop types found:', propTypes);
```

### Dry Run Mode
```typescript
// Test without writing to database
const DRY_RUN = process.env.DRY_RUN === '1';

async function upsertStats(stats: StatRecord[]) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would insert ${stats.length} stats`);
    return 0;
  }
  
  // Actual insert logic
  return await db.insert(player_game_logs).values(stats);
}
```

---

## Performance Tips

1. **Batch inserts** - Insert 100-500 records at a time, not one-by-one
2. **Connection pooling** - Reuse database connections across requests
3. **Parallel leagues** - Run ingestion for multiple leagues concurrently
4. **Index optimization** - Ensure indexes on `(player_id, prop_type, season)`
5. **Memory management** - Stream large datasets instead of loading all in memory

---

## Next Steps

After implementing a pipeline script:
1. Test with a single game/date first
2. Run a small backfill (7 days) and verify data
3. Check analytics are computed correctly
4. Run full backfill for target season
5. Set up monitoring and notifications
6. Schedule recurring ingestion jobs

---

**Related Skills:** database-patterns, error-tracking, backend-dev-guidelines
