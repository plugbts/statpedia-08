# Backfill Patterns

**Deep dive:** Date range handling, multi-league coordination, incremental progress, resumability, and verification.

---

## Overview

Backfill jobs populate historical data by:
1. **Generating date ranges** for target seasons
2. **Coordinating multiple leagues** with parallel or sequential execution
3. **Tracking progress** to allow resumption after failures
4. **Verifying completeness** with post-run queries

---

## Date Range Generation

### Basic Date Range
```typescript
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    // Format as YYYY-MM-DD
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// Usage
const dates = generateDateRange('2024-01-01', '2024-12-31');
console.log(`Generated ${dates.length} dates`); // 366 dates in 2024
```

### Days-Back Range
```typescript
function getLastNDays(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Usage
const last30Days = getLastNDays(30);
```

### Season-Based Range
```typescript
function getSeasonDateRange(league: League, season: number): { start: string; end: string } {
  const ranges = {
    NFL: {
      start: `${season - 1}-09-01`, // Season starts in September
      end: `${season}-02-28`
    },
    NBA: {
      start: `${season - 1}-10-01`, // Season starts in October
      end: `${season}-06-30`
    },
    MLB: {
      start: `${season}-03-01`, // Season starts in March
      end: `${season}-11-15`
    },
    NHL: {
      start: `${season - 1}-10-01`, // Season starts in October
      end: `${season}-06-30`
    },
    WNBA: {
      start: `${season}-05-01`, // Season starts in May
      end: `${season}-10-31`
    }
  };
  
  return ranges[league];
}

// Usage
const { start, end } = getSeasonDateRange('NFL', 2025);
const dates = generateDateRange(start, end);
```

---

## Multi-League Coordination

### Sequential Processing
```typescript
async function backfillAllLeaguesSequential(
  startDate: string,
  endDate: string
): Promise<Record<string, BackfillResult>> {
  const leagues: League[] = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA'];
  const results: Record<string, BackfillResult> = {};
  
  console.log(`🚀 Sequential backfill: ${startDate} to ${endDate}`);
  
  for (const league of leagues) {
    console.log(`\n[${league}] Starting backfill...`);
    
    try {
      const result = await ingestDateRange(league, startDate, endDate);
      results[league] = result;
      
      console.log(`[${league}] ✅ Complete: ${result.inserted} stats inserted`);
    } catch (error) {
      console.error(`[${league}] ❌ Failed:`, error);
      results[league] = { inserted: 0, errors: 1 };
    }
  }
  
  return results;
}
```

### Parallel Processing
```typescript
async function backfillAllLeaguesParallel(
  startDate: string,
  endDate: string
): Promise<Record<string, BackfillResult>> {
  const leagues: League[] = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA'];
  
  console.log(`🚀 Parallel backfill: ${startDate} to ${endDate}`);
  
  // Run all leagues concurrently
  const promises = leagues.map(async (league) => {
    try {
      const result = await ingestDateRange(league, startDate, endDate);
      return { league, result };
    } catch (error) {
      console.error(`[${league}] Failed:`, error);
      return { league, result: { inserted: 0, errors: 1 } };
    }
  });
  
  const completed = await Promise.all(promises);
  
  // Convert array to keyed object
  const results: Record<string, BackfillResult> = {};
  for (const { league, result } of completed) {
    results[league] = result;
  }
  
  return results;
}
```

---

## Incremental Progress Tracking

### Progress State
```typescript
interface BackfillProgress {
  league: League;
  startDate: string;
  endDate: string;
  currentDate: string;
  processedDates: number;
  totalDates: number;
  inserted: number;
  errors: number;
  startedAt: Date;
  lastUpdatedAt: Date;
}
```

### Save Progress to File
```typescript
import fs from 'fs/promises';

async function saveProgress(progress: BackfillProgress): Promise<void> {
  const filename = `.backfill-progress-${progress.league}-${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(progress, null, 2));
}

async function loadProgress(league: League): Promise<BackfillProgress | null> {
  try {
    const files = await fs.readdir('.');
    const progressFiles = files
      .filter(f => f.startsWith(`.backfill-progress-${league}`))
      .sort()
      .reverse();
    
    if (progressFiles.length === 0) return null;
    
    const content = await fs.readFile(progressFiles[0], 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
```

### Resumable Backfill
```typescript
async function resumableBackfill(
  league: League,
  startDate: string,
  endDate: string
): Promise<void> {
  // Try to load previous progress
  let progress = await loadProgress(league);
  
  if (progress) {
    console.log(`📂 Resuming ${league} from ${progress.currentDate}`);
    // Resume from last date
    startDate = progress.currentDate;
  } else {
    // Initialize new progress
    progress = {
      league,
      startDate,
      endDate,
      currentDate: startDate,
      processedDates: 0,
      totalDates: generateDateRange(startDate, endDate).length,
      inserted: 0,
      errors: 0,
      startedAt: new Date(),
      lastUpdatedAt: new Date()
    };
  }
  
  const dates = generateDateRange(startDate, endDate);
  
  for (const date of dates) {
    try {
      const stats = await fetchAndExtract(league, date);
      const count = await upsertGameLogs(stats);
      
      progress.inserted += count;
      progress.currentDate = date;
      progress.processedDates++;
      progress.lastUpdatedAt = new Date();
      
      // Save progress every 10 dates
      if (progress.processedDates % 10 === 0) {
        await saveProgress(progress);
        console.log(
          `[${league}] Progress: ${progress.processedDates}/${progress.totalDates} ` +
          `(${progress.inserted} stats)`
        );
      }
      
    } catch (error) {
      console.error(`[${league}] ${date} failed:`, error);
      progress.errors++;
      await saveProgress(progress);
    }
  }
  
  // Clean up progress file on completion
  await fs.unlink(`.backfill-progress-${league}-*.json`);
  console.log(`[${league}] ✅ Complete`);
}
```

---

## Batch Backfill Pattern

### Combine Multiple Seasons & Leagues
```typescript
interface BackfillConfig {
  league: League;
  season: number;
  days?: number; // Optional: limit to last N days of season
}

async function batchBackfill(configs: BackfillConfig[]): Promise<void> {
  console.log(`🚀 Batch backfill: ${configs.length} configurations`);
  
  const results: Record<string, BackfillResult> = {};
  
  for (const config of configs) {
    const key = `${config.league}-${config.season}`;
    console.log(`\n📅 Processing ${key}...`);
    
    try {
      // Get season date range
      const { start, end } = getSeasonDateRange(config.league, config.season);
      
      // Optionally limit to last N days
      let startDate = start;
      if (config.days) {
        const endDaysAgo = new Date(end);
        endDaysAgo.setDate(endDaysAgo.getDate() - config.days);
        startDate = endDaysAgo.toISOString().split('T')[0];
      }
      
      const result = await ingestDateRange(config.league, startDate, end);
      results[key] = result;
      
      console.log(
        `[${key}] ✅ ${result.inserted} stats, ${result.errors} errors`
      );
      
    } catch (error) {
      console.error(`[${key}] ❌ Failed:`, error);
      results[key] = { inserted: 0, errors: 1 };
    }
  }
  
  // Summary
  const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
  
  console.log(`\n🎉 Batch complete: ${totalInserted} stats, ${totalErrors} errors`);
}

// Usage
await batchBackfill([
  { league: 'NFL', season: 2024, days: 30 },
  { league: 'NFL', season: 2025, days: 30 },
  { league: 'NBA', season: 2024 },
  { league: 'NBA', season: 2025 },
  { league: 'MLB', season: 2024 },
  { league: 'NHL', season: 2024 }
]);
```

---

## CLI Backfill Runner

**Make backfill scripts flexible with CLI args:**

```typescript
async function main() {
  // Parse CLI arguments
  const [league, days, aheadDays] = process.argv.slice(2);
  
  if (!league) {
    console.error('Usage: tsx ingest-official-game-logs.ts <LEAGUE> [days] [aheadDays]');
    console.error('Example: tsx ingest-official-game-logs.ts NFL 30');
    process.exit(1);
  }
  
  const daysBack = Number(days) || 7;
  const daysAhead = Number(aheadDays) || 0;
  
  console.log(`🚀 Ingesting ${league} (${daysBack} days back, ${daysAhead} days ahead)`);
  
  // Calculate date range
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);
  
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);
  
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  await ingestDateRange(league as League, start, end);
}

// Usage examples:
// tsx ingest-official-game-logs.ts NFL 30        # Last 30 days
// tsx ingest-official-game-logs.ts NBA 60 7      # Last 60 days + next 7 days
// tsx ingest-official-game-logs.ts MLB 365       # Full year backfill
```

---

## Verification Queries

### Check Backfill Completeness
```sql
-- Count stats by league and date
SELECT 
  l.code as league,
  DATE(g.game_date) as date,
  COUNT(DISTINCT g.id) as games,
  COUNT(pgl.id) as stats
FROM player_game_logs pgl
JOIN games g ON g.id = pgl.game_id
JOIN leagues l ON l.id = g.league_id
WHERE g.game_date >= '2024-01-01'
  AND g.game_date < '2025-01-01'
GROUP BY l.code, DATE(g.game_date)
ORDER BY date DESC, league
LIMIT 30;
```

### Find Missing Dates
```sql
-- Generate series of dates and find gaps
WITH date_series AS (
  SELECT generate_series(
    '2024-09-01'::date,
    '2025-02-01'::date,
    '1 day'::interval
  )::date as date
),
game_dates AS (
  SELECT DISTINCT DATE(g.game_date) as date
  FROM games g
  JOIN leagues l ON l.id = g.league_id
  WHERE l.code = 'NFL'
    AND g.game_date >= '2024-09-01'
    AND g.game_date < '2025-02-01'
)
SELECT ds.date
FROM date_series ds
LEFT JOIN game_dates gd ON gd.date = ds.date
WHERE gd.date IS NULL
ORDER BY ds.date;
```

### Verify Stat Coverage
```sql
-- Check prop type distribution
SELECT 
  l.code as league,
  pgl.prop_type,
  COUNT(DISTINCT pgl.player_id) as players,
  COUNT(*) as total_stats,
  DATE(MIN(pgl.game_date)) as earliest,
  DATE(MAX(pgl.game_date)) as latest
FROM player_game_logs pgl
JOIN games g ON g.id = pgl.game_id
JOIN leagues l ON l.id = g.league_id
WHERE g.game_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY l.code, pgl.prop_type
ORDER BY league, total_stats DESC;
```

---

## Notification Patterns

### macOS Notification
```typescript
import { exec } from 'child_process';

function sendMacNotification(title: string, message: string): void {
  if (process.platform === 'darwin') {
    const escaped = message.replace(/"/g, '\\"');
    exec(`osascript -e 'display notification "${escaped}" with title "${title}"'`);
  }
}

// Usage
sendMacNotification(
  'NFL Backfill Complete',
  '58 games, 13,362 stats inserted in 4.2 minutes'
);
```

### Slack Webhook
```typescript
async function sendSlackNotification(
  webhookUrl: string,
  message: string
): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message,
      username: 'Backfill Bot',
      icon_emoji: ':chart_with_upwards_trend:'
    })
  });
}

// Usage
await sendSlackNotification(
  process.env.SLACK_WEBHOOK_URL,
  `✅ NFL backfill complete: ${inserted} stats inserted, ${errors} errors`
);
```

---

## Error Handling & Retry

### Exponential Backoff
```typescript
async function ingestWithRetry(
  league: League,
  date: string,
  maxRetries = 3
): Promise<StatRecord[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchAndExtract(league, date);
    } catch (error) {
      lastError = error as Error;
      console.warn(`[${league}] ${date} attempt ${attempt}/${maxRetries} failed`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delaySec = Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delaySec}s...`);
        await sleep(delaySec * 1000);
      }
    }
  }
  
  throw lastError;
}
```

### Graceful Failure
```typescript
async function ingestDateRangeGraceful(
  league: League,
  dates: string[]
): Promise<BackfillResult> {
  let inserted = 0;
  let errors = 0;
  const failed: string[] = [];
  
  for (const date of dates) {
    try {
      const stats = await ingestWithRetry(league, date);
      inserted += await upsertGameLogs(stats);
    } catch (error) {
      console.error(`[${league}] ${date} failed after retries:`, error.message);
      errors++;
      failed.push(date);
    }
  }
  
  // Report failed dates
  if (failed.length > 0) {
    console.warn(`[${league}] Failed dates (${failed.length}):`, failed.join(', '));
    console.warn('Re-run backfill for these dates with: --dates', failed.join(','));
  }
  
  return { inserted, errors, failed };
}
```

---

## Performance Patterns

### Staggered Start Times
```typescript
// Prevent API rate limits by staggering league start times
async function backfillStaggered(
  configs: BackfillConfig[],
  staggerMs = 5000
): Promise<void> {
  const promises: Promise<void>[] = [];
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    
    // Stagger each league by staggerMs
    const promise = (async () => {
      await sleep(i * staggerMs);
      console.log(`[${config.league}] Starting (stagger ${i * staggerMs}ms)...`);
      await ingestSeason(config.league, config.season);
    })();
    
    promises.push(promise);
  }
  
  await Promise.all(promises);
}
```

### Rate Limiting Across Leagues
```typescript
// Shared rate limiter for all leagues
class GlobalRateLimiter {
  private lastRequestTime = 0;
  private minDelayMs = 200; // 5 req/sec max
  
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minDelayMs) {
      await sleep(this.minDelayMs - elapsed);
    }
    
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new GlobalRateLimiter();

async function fetchWithGlobalLimit(url: string): Promise<Response> {
  await rateLimiter.wait();
  return fetch(url);
}
```

---

## Testing Patterns

### Test Single Date
```typescript
async function testSingleDate() {
  const league = 'NFL';
  const date = '2025-01-26'; // Known game date
  
  console.log(`Testing ${league} ingestion for ${date}`);
  
  const stats = await fetchAndExtract(league, date);
  
  console.log(`✅ Extracted ${stats.length} stats`);
  console.log('Sample stats:', stats.slice(0, 5));
  
  // Dry run - don't insert
  console.log('[DRY_RUN] Skipping database insert');
}
```

### Small Backfill Test
```typescript
async function testSmallBackfill() {
  const league = 'NFL';
  const last7Days = getLastNDays(7);
  
  console.log(`Testing ${league} backfill for last 7 days`);
  
  const result = await ingestDateRange(league, last7Days[0], last7Days[6]);
  
  console.log('Result:', result);
  console.table({
    'Dates Processed': last7Days.length,
    'Stats Inserted': result.inserted,
    'Errors': result.errors
  });
}
```

---

## Common Pitfalls

### Pitfall 1: Hardcoded Date Ranges
```typescript
// BAD: Hardcoded dates become stale
const dates = generateDateRange('2024-01-01', '2024-12-31');

// GOOD: Calculate from season or days-back
const { start, end } = getSeasonDateRange('NFL', 2025);
const dates = generateDateRange(start, end);
```

### Pitfall 2: No Progress Tracking
```typescript
// BAD: Can't resume after crash
for (const date of allDates) {
  await ingestDate(date);
}

// GOOD: Save progress periodically
for (const date of allDates) {
  await ingestDate(date);
  if (++processed % 10 === 0) {
    await saveProgress({ date, processed });
  }
}
```

### Pitfall 3: Serial Leagues When Could Parallelize
```typescript
// BAD: 5 leagues × 10 min each = 50 min total
for (const league of leagues) {
  await backfillLeague(league);
}

// GOOD: All leagues run concurrently = ~10 min total
await Promise.all(leagues.map(l => backfillLeague(l)));
```

---

## Next Steps

After implementing backfill:
1. Test with single date first
2. Test with small range (7 days)
3. Run full season backfill with monitoring
4. Verify completeness with SQL queries
5. Set up notifications for completion
6. Schedule periodic backfill jobs (daily/weekly)

---

**Related:** [Ingestion Patterns](./ingestion-patterns.md), [Enrichment Patterns](./enrichment-patterns.md), [Monitoring Patterns](./monitoring-patterns.md)
