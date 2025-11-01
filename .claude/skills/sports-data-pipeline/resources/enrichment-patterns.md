# Enrichment Patterns

**Deep dive:** Analytics calculations, hit rates, streaks, rolling averages, and batch processing for large datasets.

---

## Overview

Enrichment transforms raw game logs into actionable analytics:
- **Season averages** - Mean stat value across all games in a season
- **Rolling averages** - L5, L10, L20 (last 5/10/20 games)
- **Hit rates** - Percentage of games where player exceeded their line
- **Streaks** - Current consecutive over/under streak
- **Head-to-head** - Performance vs specific opponents
- **Matchup grades** - Defensive ranking context

---

## Season-Level Analytics

### Core Pattern: Player-Prop-Season Combinations

```typescript
interface AnalyticsRecord {
  player_id: UUID;
  prop_type: string;
  season: string; // "2024", "2025"
  games_played: number;
  season_avg: number;
  l5_avg: number | null;
  l10_avg: number | null;
  l20_avg: number | null;
  l5_hit_rate: number | null; // Percentage (0-100)
  l10_hit_rate: number | null;
  l20_hit_rate: number | null;
  current_streak: number; // Positive for over, negative for under
  h2h_avg: number | null; // vs most recent opponent
  matchup_rank: number | null; // Opponent defensive rank
  sport: string; // "nfl", "nba", "mlb", "nhl", "wnba"
  updated_at: Date;
}
```

### Enrichment Loop

```typescript
async function enrichPlayerAnalytics(
  playerId: UUID,
  propType: string,
  season: string
): Promise<void> {
  // Fetch all game logs for this combo
  const logs = await db.execute(sql`
    SELECT 
      pgl.actual_value::numeric AS actual_value,
      pgl.line::numeric AS line,
      COALESCE(pgl.hit, (pgl.actual_value::numeric > COALESCE(pgl.line::numeric, 0))) AS hit,
      pgl.opponent_team_id,
      pgl.game_date
    FROM player_game_logs pgl
    WHERE pgl.player_id = ${playerId}
      AND pgl.prop_type = ${propType}
      AND EXTRACT(YEAR FROM pgl.game_date)::text = ${season}
    ORDER BY pgl.game_date DESC
    LIMIT 20
  `);
  
  if (logs.length === 0) return;
  
  // Calculate all metrics
  const analytics = {
    player_id: playerId,
    prop_type: propType,
    season: season,
    games_played: logs.length,
    season_avg: calculateSeasonAverage(logs),
    l5_avg: calculateRollingAverage(logs, 5),
    l10_avg: calculateRollingAverage(logs, 10),
    l20_avg: calculateRollingAverage(logs, 20),
    l5_hit_rate: calculateHitRate(logs, 5),
    l10_hit_rate: calculateHitRate(logs, 10),
    l20_hit_rate: calculateHitRate(logs, 20),
    current_streak: calculateStreak(logs),
    h2h_avg: calculateHeadToHead(logs),
    matchup_rank: await getMatchupRank(logs[0].opponent_team_id, propType, season),
    sport: await resolveSport(playerId, season)
  };
  
  // Upsert to player_analytics table
  await upsertAnalytics(analytics);
}
```

---

## Calculation Functions

### Season Average
```typescript
function calculateSeasonAverage(logs: GameLog[]): number {
  if (logs.length === 0) return 0;
  
  const sum = logs.reduce((acc, log) => acc + Number(log.actual_value), 0);
  return sum / logs.length;
}
```

### Rolling Averages (L5, L10, L20)
```typescript
function calculateRollingAverage(logs: GameLog[], window: number): number | null {
  // Take most recent N games
  const recent = logs.slice(0, window);
  
  if (recent.length === 0) return null;
  
  const sum = recent.reduce((acc, log) => acc + Number(log.actual_value), 0);
  return sum / recent.length;
}
```

### Hit Rates
```typescript
function calculateHitRate(logs: GameLog[], window: number): number | null {
  // Only calculate if line data is available
  const logsWithLines = logs.filter(log => log.line !== null);
  
  if (logsWithLines.length === 0) return null;
  
  const recent = logsWithLines.slice(0, window);
  
  if (recent.length === 0) return null;
  
  const hits = recent.filter(log => log.hit === true).length;
  return (hits / recent.length) * 100; // Return as percentage
}
```

### Current Streak
```typescript
function calculateStreak(logs: GameLog[]): number {
  if (logs.length === 0) return 0;
  
  // Start from most recent game
  const firstHit = logs[0].hit;
  let streak = 0;
  
  for (const log of logs) {
    if (log.hit === firstHit) {
      streak++;
    } else {
      break; // Streak ended
    }
  }
  
  // Positive for over streak, negative for under streak
  return firstHit ? streak : -streak;
}
```

### Head-to-Head Average
```typescript
function calculateHeadToHead(logs: GameLog[]): number | null {
  // Use most recent opponent
  const recentOpponent = logs[0]?.opponent_team_id;
  
  if (!recentOpponent) return null;
  
  // Filter for games against this opponent
  const h2hGames = logs.filter(log => log.opponent_team_id === recentOpponent);
  
  if (h2hGames.length === 0) return null;
  
  const sum = h2hGames.reduce((acc, log) => acc + Number(log.actual_value), 0);
  return sum / h2hGames.length;
}
```

### Matchup Rank
```typescript
async function getMatchupRank(
  opponentId: UUID,
  propType: string,
  season: string
): Promise<number | null> {
  if (!opponentId) return null;
  
  try {
    const result = await db.execute(sql`
      SELECT rank
      FROM defense_ranks
      WHERE team_id = ${opponentId}
        AND prop_type = ${propType}
        AND season = ${season}
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    
    return result[0]?.rank ?? null;
  } catch {
    // defense_ranks table may not exist yet
    return null;
  }
}
```

---

## Batch Processing

### Page Through Player-Prop Combinations

```typescript
async function enrichAllCombinations(
  season?: string,
  maxLimit = 2000,
  batchSize = 250
): Promise<void> {
  console.log(`[enrich] season=${season || 'ALL'} limit=${maxLimit} batch=${batchSize}`);
  
  let processed = 0;
  
  for (let offset = 0; processed < maxLimit; offset += batchSize) {
    const remaining = maxLimit - processed;
    const take = Math.min(batchSize, remaining);
    
    console.log(`[enrich] fetching page offset=${offset} take=${take}`);
    
    // Fetch distinct player-prop-season combinations
    const page = await db.execute(sql`
      SELECT 
        pgl.player_id, 
        pgl.prop_type, 
        EXTRACT(YEAR FROM pgl.game_date)::text as season
      FROM player_game_logs pgl
      ${season ? sql`WHERE EXTRACT(YEAR FROM pgl.game_date)::text = ${season}` : sql``}
      GROUP BY pgl.player_id, pgl.prop_type, EXTRACT(YEAR FROM pgl.game_date)
      ORDER BY season DESC
      LIMIT ${take} OFFSET ${offset}
    `);
    
    if (page.length === 0) break;
    
    // Process each combination
    for (const row of page) {
      try {
        await enrichPlayerAnalytics(row.player_id, row.prop_type, row.season);
        processed++;
        
        // Progress update every 50 records
        if (processed % 50 === 0) {
          console.log(`[enrich] processed ${processed}/${maxLimit}`);
        }
      } catch (error) {
        console.error(`[enrich] failed ${row.player_id} ${row.prop_type}:`, error);
      }
    }
  }
  
  console.log(`[enrich] complete: ${processed} combinations processed`);
}
```

---

## Active-Only Enrichment

**Optimization:** Focus only on players who have upcoming props in a date window.

```typescript
async function enrichActivePlayers(
  windowBackDays = 3,
  windowAheadDays = 3,
  batchSize = 250
): Promise<void> {
  console.log(`[enrich] active-only mode: back=${windowBackDays} ahead=${windowAheadDays}`);
  
  let processed = 0;
  
  for (let offset = 0; ; offset += batchSize) {
    // Find player-prop combos with props in date window
    const page = await db.execute(sql`
      SELECT DISTINCT 
        pp.player_id, 
        pt.name AS prop_type, 
        EXTRACT(YEAR FROM g.game_date)::text AS season
      FROM player_props pp
      JOIN prop_types pt ON pt.id = pp.prop_type_id
      JOIN games g ON g.id = pp.game_id
      WHERE g.game_date BETWEEN 
        (CURRENT_DATE - ${windowBackDays}::int) AND 
        (CURRENT_DATE + ${windowAheadDays}::int)
      ORDER BY season DESC
      LIMIT ${batchSize} OFFSET ${offset}
    `);
    
    if (page.length === 0) break;
    
    for (const row of page) {
      await enrichPlayerAnalytics(row.player_id, row.prop_type, row.season);
      processed++;
    }
  }
  
  console.log(`[enrich] active-only complete: ${processed} players`);
}
```

---

## Upsert Pattern

**Always use ON CONFLICT to allow re-running:**

```typescript
async function upsertAnalytics(analytics: AnalyticsRecord): Promise<void> {
  await db.execute(sql`
    INSERT INTO player_analytics (
      player_id, prop_type, season, games_played,
      season_avg, l5_avg, l10_avg, l20_avg,
      l5_hit_rate, l10_hit_rate, l20_hit_rate,
      current_streak, h2h_avg, matchup_rank, sport,
      updated_at
    )
    VALUES (
      ${analytics.player_id}, ${analytics.prop_type}, ${analytics.season}, 
      ${analytics.games_played}, ${analytics.season_avg}, ${analytics.l5_avg}, 
      ${analytics.l10_avg}, ${analytics.l20_avg}, ${analytics.l5_hit_rate}, 
      ${analytics.l10_hit_rate}, ${analytics.l20_hit_rate}, ${analytics.current_streak}, 
      ${analytics.h2h_avg}, ${analytics.matchup_rank}, ${analytics.sport}, NOW()
    )
    ON CONFLICT (player_id, prop_type, season)
    DO UPDATE SET
      games_played = EXCLUDED.games_played,
      season_avg = EXCLUDED.season_avg,
      l5_avg = EXCLUDED.l5_avg,
      l10_avg = EXCLUDED.l10_avg,
      l20_avg = EXCLUDED.l20_avg,
      l5_hit_rate = EXCLUDED.l5_hit_rate,
      l10_hit_rate = EXCLUDED.l10_hit_rate,
      l20_hit_rate = EXCLUDED.l20_hit_rate,
      current_streak = EXCLUDED.current_streak,
      h2h_avg = EXCLUDED.h2h_avg,
      matchup_rank = EXCLUDED.matchup_rank,
      sport = EXCLUDED.sport,
      updated_at = NOW()
  `);
}
```

---

## Performance Optimizations

### Transaction Timeouts
```typescript
// Prevent hung transactions in long-running jobs
await db.execute(sql`SET statement_timeout TO '10s'`);
await db.execute(sql`SET lock_timeout TO '5s'`);
await db.execute(sql`SET idle_in_transaction_session_timeout TO '30s'`);
```

### Heartbeat Monitoring
```typescript
let processed = 0;
let lastReportAt = Date.now();
let lastReportedProcessed = 0;

const heartbeat = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const delta = processed - lastReportedProcessed;
  const since = Math.max(1, Math.floor((Date.now() - lastReportAt) / 1000));
  const rate = (delta / since).toFixed(1);
  
  console.log(
    `[enrich] heartbeat: processed=${processed} elapsed=${elapsed}s rate=${rate}/s`
  );
  
  lastReportAt = Date.now();
  lastReportedProcessed = processed;
}, 3000); // Every 3 seconds

// Clear at end
clearInterval(heartbeat);
```

### Index Optimization
```sql
-- Ensure indexes exist for fast enrichment queries
CREATE INDEX IF NOT EXISTS idx_player_game_logs_enrichment 
  ON player_game_logs(player_id, prop_type, game_date DESC);

CREATE INDEX IF NOT EXISTS idx_player_analytics_lookup 
  ON player_analytics(player_id, prop_type, season);
```

---

## Sport Resolution

**Resolve sport from latest game log:**

```typescript
async function resolveSport(playerId: UUID, season: string): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT l.sport
      FROM player_game_logs pgl
      JOIN games g ON g.id = pgl.game_id
      JOIN leagues l ON l.id = g.league_id
      WHERE pgl.player_id = ${playerId}
        AND EXTRACT(YEAR FROM pgl.game_date)::text = ${season}
      ORDER BY g.game_date DESC
      LIMIT 1
    `);
    
    return result[0]?.sport ?? null;
  } catch {
    // Sport resolution is optional
    return null;
  }
}
```

---

## CLI Arguments & Env Vars

**Make enrichment scripts configurable:**

```typescript
// Parse CLI arguments and environment variables
const seasonFilter = process.argv[2] || process.env.ENRICH_SEASON || '';
const maxLimit = Number(process.argv[3] || process.env.ENRICH_LIMIT || 2000);
const batchSize = Number(process.env.ENRICH_BATCH || 250);
const activeOnly = process.env.ENRICH_ACTIVE_ONLY === '1';
const windowBackDays = Number(process.env.ENRICH_BACK_DAYS || 3);
const windowAheadDays = Number(process.env.ENRICH_AHEAD_DAYS || 3);

console.log(`[enrich] Config:`, {
  season: seasonFilter || 'ALL',
  maxLimit,
  batchSize,
  activeOnly,
  windowBackDays,
  windowAheadDays
});

// Usage examples:
// npm run analytics:enrich
// ENRICH_SEASON=2025 npm run analytics:enrich
// ENRICH_ACTIVE_ONLY=1 npm run analytics:enrich
// tsx scripts/enrich-player-analytics.ts 2025 5000
```

---

## Testing Patterns

### Test Single Player
```typescript
async function testSinglePlayer() {
  const playerId = '4c7a1347-b29c-4ef5-a3d1-8234567890ab';
  const propType = 'Passing Yards';
  const season = '2024';
  
  console.log(`Testing enrichment for player ${playerId}`);
  
  await enrichPlayerAnalytics(playerId, propType, season);
  
  // Verify result
  const result = await db.execute(sql`
    SELECT * FROM player_analytics
    WHERE player_id = ${playerId}
      AND prop_type = ${propType}
      AND season = ${season}
  `);
  
  console.log('Analytics:', result[0]);
}
```

### Dry Run with Sample Data
```typescript
async function dryRunEnrichment() {
  // Fetch sample combos
  const sample = await db.execute(sql`
    SELECT player_id, prop_type, season
    FROM (
      SELECT DISTINCT 
        pgl.player_id, 
        pgl.prop_type, 
        EXTRACT(YEAR FROM pgl.game_date)::text as season
      FROM player_game_logs pgl
      ORDER BY pgl.created_at DESC
      LIMIT 10
    ) t
  `);
  
  console.log(`[DRY_RUN] Would process ${sample.length} combinations:`);
  console.table(sample);
  
  // Calculate without writing
  for (const row of sample) {
    const analytics = await calculateAnalytics(row.player_id, row.prop_type, row.season);
    console.log(`${row.prop_type}:`, {
      season_avg: analytics.season_avg.toFixed(1),
      l5_avg: analytics.l5_avg?.toFixed(1),
      current_streak: analytics.current_streak
    });
  }
}
```

---

## Common Pitfalls

### Pitfall 1: Not Handling Nulls
```typescript
// BAD: Assumes line always exists
const hit = log.actual_value > log.line;

// GOOD: Handle null lines
const hit = log.line !== null 
  ? log.actual_value > log.line 
  : null;
```

### Pitfall 2: Integer Division
```typescript
// BAD: JavaScript integer division loses precision
const avg = sum / count; // May round unexpectedly

// GOOD: Use Number() for database numerics
const avg = Number(sum) / Number(count);
```

### Pitfall 3: Processing Stale Data
```typescript
// BAD: Enrich all historical data every time
await enrichAllCombinations();

// GOOD: Focus on active players or recent season
await enrichActivePlayers(); // Only players with upcoming props
// OR
await enrichAllCombinations('2025'); // Only current season
```

### Pitfall 4: Missing Indexes
```typescript
// BAD: Query without indexes is slow
SELECT * FROM player_game_logs 
WHERE player_id = ? AND prop_type = ?
ORDER BY game_date DESC;

// GOOD: Ensure index exists first
CREATE INDEX idx_player_game_logs_enrichment 
  ON player_game_logs(player_id, prop_type, game_date DESC);
```

---

## Scheduling Patterns

### Hourly Enrichment (Active Players Only)
```bash
#!/bin/bash
# Run every hour to keep active player analytics fresh
ENRICH_ACTIVE_ONLY=1 ENRICH_BACK_DAYS=1 ENRICH_AHEAD_DAYS=7 \\
  tsx scripts/enrich-player-analytics.ts
```

### Daily Full Enrichment (Current Season)
```bash
#!/bin/bash
# Run once daily to refresh all current season analytics
ENRICH_SEASON=2025 ENRICH_LIMIT=10000 \\
  tsx scripts/enrich-player-analytics.ts
```

### Weekly Historical Enrichment
```bash
#!/bin/bash
# Run weekly to update all historical analytics
tsx scripts/enrich-player-analytics.ts
```

---

## Verification Queries

### Check Analytics Coverage
```sql
-- Count analytics by sport and season
SELECT 
  sport,
  season,
  COUNT(DISTINCT player_id) as players,
  COUNT(DISTINCT prop_type) as prop_types,
  COUNT(*) as total_records
FROM player_analytics
GROUP BY sport, season
ORDER BY season DESC, sport;
```

### Find Players with Missing Analytics
```sql
-- Players with recent game logs but no analytics
SELECT DISTINCT 
  pgl.player_id,
  pgl.prop_type,
  EXTRACT(YEAR FROM pgl.game_date)::text as season
FROM player_game_logs pgl
LEFT JOIN player_analytics pa 
  ON pa.player_id = pgl.player_id 
  AND pa.prop_type = pgl.prop_type
  AND pa.season = EXTRACT(YEAR FROM pgl.game_date)::text
WHERE pa.id IS NULL
  AND pgl.game_date > CURRENT_DATE - INTERVAL '30 days'
LIMIT 20;
```

### Validate Analytics Values
```sql
-- Check for suspicious values
SELECT *
FROM player_analytics
WHERE 
  season_avg < 0 OR season_avg > 1000
  OR l5_avg < 0 OR l5_avg > 1000
  OR l5_hit_rate < 0 OR l5_hit_rate > 100
LIMIT 20;
```

---

## Next Steps

After implementing enrichment:
1. Run on a small sample first (10-20 players)
2. Verify analytics values look correct
3. Check indexes are in place
4. Run full enrichment for current season
5. Schedule hourly/daily enrichment jobs
6. Monitor performance and adjust batch sizes

---

**Related:** [Ingestion Patterns](./ingestion-patterns.md), [Backfill Patterns](./backfill-patterns.md), [Monitoring Patterns](./monitoring-patterns.md)
