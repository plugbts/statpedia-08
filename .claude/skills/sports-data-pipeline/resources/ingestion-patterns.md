# Ingestion Patterns

**Deep dive:** ESPN API structure, pagination, league-specific extraction, and data normalization patterns.

---

## ESPN API Structure

### URL Patterns by League

```typescript
const ESPN_ENDPOINTS = {
  NBA: {
    schedule: (date: string) => 
      `https://cdn.nba.com/static/json/liveData/scoreboard/v2/scoreboard_${date.replace(/-/g, '')}.json`,
    summary: (gameId: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`
  },
  
  NFL: {
    schedule: (date: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date.replace(/-/g, '')}`,
    summary: (gameId: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`
  },
  
  MLB: {
    schedule: (date: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date.replace(/-/g, '')}`,
    summary: (gameId: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`
  },
  
  NHL: {
    schedule: (date: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date.replace(/-/g, '')}`,
    summary: (gameId: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=${gameId}`
  },
  
  WNBA: {
    schedule: (gameDate: string) => {
      // WNBA requires MM/DD/YYYY format
      const [y, m, d] = gameDate.split('-');
      return `https://stats.wnba.com/stats/scoreboardv2?DayOffset=0&GameDate=${m}/${d}/${y}&LeagueID=10`;
    },
    summary: (gameId: string) => 
      `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event=${gameId}`
  }
};
```

### Response Structure

**Schedule endpoint returns:**
```json
{
  "events": [
    {
      "id": "401671720",
      "name": "Team A at Team B",
      "date": "2025-01-15T01:15Z",
      "competitions": [{
        "competitors": [
          { "team": { "abbreviation": "BUF" }, "homeAway": "home" },
          { "team": { "abbreviation": "KC" }, "homeAway": "away" }
        ]
      }]
    }
  ]
}
```

**Summary endpoint returns boxscore with two key structures:**

1. **Labels + Stats Arrays (NFL, NBA, MLB, NHL)**
```json
{
  "boxscore": {
    "players": [
      {
        "team": { "abbreviation": "KC" },
        "statistics": [
          {
            "athlete": { "displayName": "Patrick Mahomes" },
            "labels": ["Passing Yards", "Completions/Attempts", "Passing Touchdowns"],
            "stats": ["320", "25/35", "3"]
          }
        ]
      }
    ]
  }
}
```

2. **Name-Value Pairs (alternative structure)**
```json
{
  "boxscore": {
    "players": [
      {
        "statistics": [
          {
            "athlete": { "displayName": "Player Name" },
            "stats": [
              { "name": "passingYards", "displayValue": "320" },
              { "name": "passingTouchdowns", "displayValue": "3" }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## NFL Extraction Pattern

**Challenge:** ESPN returns compound stats like "12/18" for completions/attempts and "5-46" for receptions-yards.

**Solution:** Parse compound stats and map labels to specific prop types.

```typescript
const NFL_PROP_TYPE_MAPPING: Record<string, string> = {
  // Passing
  'Passing Yards': 'Passing Yards',
  'Completions/Attempts': 'Pass Completions', // Parse first number
  'Passing Touchdowns': 'Passing TDs',
  'Interceptions': 'Interceptions',
  'Sacks': 'Sacks Taken',
  
  // Rushing
  'Rushing Yards': 'Rushing Yards',
  'Rushing Attempts': 'Rush Attempts',
  'Rushing Touchdowns': 'Rushing TDs',
  'Longest Rush': 'Longest Rush',
  
  // Receiving
  'Receptions': 'Receptions',
  'Receiving Yards': 'Receiving Yards',
  'Receiving Touchdowns': 'Receiving TDs',
  'Longest Reception': 'Longest Reception',
  'Targets': 'Targets',
  
  // Defensive
  'Tackles': 'Tackles',
  'Sacks': 'Sacks',
  'Interceptions': 'Interceptions',
  'Forced Fumbles': 'Forced Fumbles',
  
  // Kicking
  'Field Goals Made/Attempted': 'FG Made', // Parse first number
  'Extra Points Made/Attempted': 'XP Made', // Parse first number
  'Longest Field Goal Made': 'Longest FG'
};

async function extractNFLStats(summary: any, gameId: string, gameDate: string, leagueId: string) {
  const stats: StatRecord[] = [];
  const players = summary?.boxscore?.players || [];
  
  for (const teamData of players) {
    const teamAbbrev = teamData.team?.abbreviation;
    const teamId = await getOrCreateTeam('NFL', teamAbbrev);
    
    for (const playerData of teamData.statistics || []) {
      const athlete = playerData.athlete;
      const labels = playerData.labels || [];
      const values = playerData.stats || [];
      
      // Parallel arrays: iterate by index
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const rawValue = values[i];
        const propType = NFL_PROP_TYPE_MAPPING[label];
        
        if (!propType || !rawValue) continue;
        
        // Parse compound stats
        const parsedValue = parseNFLStatValue(rawValue, label);
        
        if (parsedValue !== null) {
          stats.push({
            player_name: athlete.displayName,
            player_id: athlete.id, // ESPN athlete ID
            prop_type: propType,
            stat_value: parsedValue,
            team_id: teamId,
            game_id: gameId,
            game_date: gameDate,
            league_id: leagueId
          });
        }
      }
    }
  }
  
  return stats;
}

function parseNFLStatValue(rawValue: string, label: string): number | null {
  if (!rawValue || rawValue === '--' || rawValue === '-') return null;
  
  // Handle compound stats: "12/18" → 12
  if (rawValue.includes('/')) {
    const [first] = rawValue.split('/');
    return parseFloat(first) || null;
  }
  
  // Handle "5-46" (receptions-yards) → 5 for receptions
  if (rawValue.includes('-') && label === 'Receptions') {
    const [first] = rawValue.split('-');
    return parseFloat(first) || null;
  }
  
  // Simple numeric value
  const num = parseFloat(rawValue.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}
```

---

## NBA Extraction Pattern

**Challenge:** NBA uses both displayValue (formatted string) and value (raw number).

```typescript
async function extractNBAStats(summary: any, gameId: string, gameDate: string, leagueId: string) {
  const stats: StatRecord[] = [];
  const players = summary?.boxscore?.players || [];
  
  for (const teamData of players) {
    const teamAbbrev = teamData.team?.abbreviation;
    const teamId = await getOrCreateTeam('NBA', teamAbbrev);
    
    for (const playerData of teamData.statistics || []) {
      const athlete = playerData.athlete;
      const playerStats = playerData.stats || [];
      
      for (const stat of playerStats) {
        const propType = mapNBAStat(stat.name);
        if (!propType) continue;
        
        // Prefer raw value over displayValue
        const value = stat.value ?? parseFloat(stat.displayValue);
        if (value === null || isNaN(value)) continue;
        
        stats.push({
          player_name: athlete.displayName,
          player_id: athlete.id,
          prop_type: propType,
          stat_value: value,
          team_id: teamId,
          game_id: gameId,
          game_date: gameDate,
          league_id: leagueId
        });
      }
    }
  }
  
  return stats;
}

function mapNBAStat(statName: string): string | null {
  const mapping: Record<string, string> = {
    'points': 'Points',
    'rebounds': 'Rebounds',
    'assists': 'Assists',
    'steals': 'Steals',
    'blocks': 'Blocks',
    'turnovers': 'Turnovers',
    'threePointFieldGoalsMade': '3-PT Made',
    // ... more mappings
  };
  
  return mapping[statName] || null;
}
```

---

## Pagination & Rate Limiting

### Date Range Generation
```typescript
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
```

### Rate-Limited Fetching
```typescript
async function fetchWithRateLimit<T>(
  url: string,
  options?: RequestInit,
  delayMs = 200
): Promise<T> {
  await sleep(delayMs);
  
  const response = await fetchWithTimeout(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  
  return response.json();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Retry Logic
```typescript
async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithRateLimit<T>(url, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }
  
  throw lastError;
}
```

---

## Upsert Pattern

**Always use upsert to handle duplicates and allow re-running:**

```typescript
async function upsertGameLogs(stats: StatRecord[]): Promise<number> {
  if (stats.length === 0) return 0;
  
  // Batch insert with ON CONFLICT handling
  const result = await db.execute(sql`
    INSERT INTO player_game_logs (
      player_id, game_id, team_id, league_id, prop_type, 
      stat_value, game_date, created_at
    )
    SELECT * FROM ${sql.unnest(
      stats.map(s => [
        s.player_id, s.game_id, s.team_id, s.league_id, 
        s.prop_type, s.stat_value, s.game_date, 'NOW()'
      ]),
      ['uuid', 'uuid', 'uuid', 'uuid', 'text', 'numeric', 'date', 'timestamp']
    )}
    ON CONFLICT (game_id, player_id, prop_type) 
    DO UPDATE SET
      stat_value = EXCLUDED.stat_value,
      updated_at = NOW()
  `);
  
  return stats.length;
}
```

---

## Progress Tracking

### Console Progress Updates
```typescript
async function ingestDateRange(league: League, dates: string[]) {
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  
  const startTime = Date.now();
  
  for (const date of dates) {
    try {
      const stats = await fetchAndExtract(league, date);
      inserted += await upsertGameLogs(stats);
      processed++;
      
      // Update every 10 dates
      if (processed % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (processed / (Date.now() - startTime) * 1000).toFixed(2);
        console.log(
          `[${league}] ${processed}/${dates.length} dates ` +
          `(${inserted} stats, ${errors} errors) ` +
          `${elapsed}s elapsed, ${rate} dates/sec`
        );
      }
      
    } catch (error) {
      console.error(`[${league}] ${date} failed:`, error);
      errors++;
    }
  }
  
  console.log(
    `[${league}] Complete: ${processed} dates, ` +
    `${inserted} stats inserted, ${errors} errors, ` +
    `${((Date.now() - startTime) / 1000).toFixed(1)}s`
  );
}
```

### macOS Notifications
```typescript
function sendNotification(title: string, message: string) {
  if (process.platform === 'darwin') {
    exec(`osascript -e 'display notification "${message}" with title "${title}"'`);
  }
}

// Usage
sendNotification('NFL Backfill Complete', '58 games processed, 13,362 stats inserted');
```

---

## Error Handling

### Per-Game Error Handling
```typescript
// DON'T stop entire batch on one failure
for (const game of games) {
  try {
    const stats = await extractStats(game);
    await upsertGameLogs(stats);
  } catch (error) {
    // Log and continue
    console.error(`Failed game ${game.id}:`, error);
    errorLog.push({ gameId: game.id, error: error.message });
  }
}
```

### Graceful Degradation
```typescript
async function fetchSchedule(league: League, date: string) {
  try {
    return await fetchScheduleFromESPN(league, date);
  } catch (error) {
    console.warn(`ESPN unavailable for ${league} ${date}, trying fallback...`);
    
    try {
      return await fetchScheduleFromFallback(league, date);
    } catch (fallbackError) {
      console.error(`All sources failed for ${league} ${date}`);
      return []; // Return empty, don't crash
    }
  }
}
```

---

## Testing Patterns

### Single Game Test
```typescript
// Test extraction on a known game
async function testSingleGame() {
  const gameId = '401671720'; // Bills @ Chiefs playoff game
  const summary = await fetchESPN(`/nfl/summary?event=${gameId}`);
  
  const stats = await extractNFLStats(summary, gameId, '2025-01-26', leagueId);
  
  console.log(`✅ Extracted ${stats.length} stats`);
  console.log('\nSample stats:');
  console.table(stats.slice(0, 10).map(s => ({
    player: s.player_name,
    type: s.prop_type,
    value: s.stat_value
  })));
  
  // Verify expected stats are present
  const propTypes = [...new Set(stats.map(s => s.prop_type))];
  console.log(`\nProp types found (${propTypes.length}):`, propTypes);
  
  // Check for specific players
  const mahomesStats = stats.filter(s => s.player_name.includes('Mahomes'));
  console.log(`\nMahomes stats:`, mahomesStats);
}
```

### Dry Run Mode
```typescript
const DRY_RUN = process.env.DRY_RUN === '1';

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No database writes');
}

async function upsertGameLogs(stats: StatRecord[]) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would insert ${stats.length} stats`);
    console.log('Sample:', stats[0]);
    return stats.length;
  }
  
  // Actual database insert
  return await db.insert(player_game_logs).values(stats);
}
```

---

## Common Pitfalls

### Pitfall 1: Not Handling Missing Data
```typescript
// BAD: Assumes data exists
const passingYards = player.stats[0];

// GOOD: Safe navigation
const passingYards = player.stats?.[0] ?? null;
if (passingYards !== null) {
  // Process stat
}
```

### Pitfall 2: Incorrect Date Formats
```typescript
// BAD: Date format mismatch
const date = '2025-01-15';
const url = `scoreboard?dates=${date}`; // ESPN wants YYYYMMDD

// GOOD: Format correctly per API
const espnDate = date.replace(/-/g, ''); // "20250115"
const url = `scoreboard?dates=${espnDate}`;
```

### Pitfall 3: Ignoring Rate Limits
```typescript
// BAD: Blast API as fast as possible
await Promise.all(games.map(g => fetchGame(g)));

// GOOD: Sequential with delays
for (const game of games) {
  await fetchGame(game);
  await sleep(200); // 5 requests/second max
}
```

---

## Performance Optimization

### Batch Database Inserts
```typescript
// Insert in batches of 500
const BATCH_SIZE = 500;
for (let i = 0; i < stats.length; i += BATCH_SIZE) {
  const batch = stats.slice(i, i + BATCH_SIZE);
  await upsertGameLogs(batch);
}
```

### Parallel League Ingestion
```typescript
// Run multiple leagues concurrently
await Promise.all([
  ingestLeague('NFL', dateRange),
  ingestLeague('NBA', dateRange),
  ingestLeague('MLB', dateRange)
]);
```

### Connection Pooling
```typescript
// Reuse database connection
const client = postgres(connectionString, {
  max: 10, // Pool size
  idle_timeout: 20,
  connect_timeout: 10
});
```

---

**Related:** [Enrichment Patterns](./enrichment-patterns.md), [Backfill Patterns](./backfill-patterns.md)
