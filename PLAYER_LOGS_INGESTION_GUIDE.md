# NBA/WNBA Player Logs Ingestion System

This guide covers the complete implementation of the NBA/WNBA player logs ingestion system with resilient data handling, proper schema validation, and comprehensive error handling.

## 🏗️ Architecture Overview

The system consists of several key components:

1. **Database Schema** - Enhanced tables with proper indexes and constraints
2. **Resilient Lookup Functions** - Safe game/player/team resolution
3. **API Integration** - Browser-like headers and retry logic
4. **Ingestion Pipeline** - Single-game and batch processing
5. **Validation & Testing** - Comprehensive test suite

## 📊 Database Schema

### Required Columns Added

```sql
-- Players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Games table  
ALTER TABLE games ADD COLUMN IF NOT EXISTS api_game_id TEXT UNIQUE;

-- Team abbreviation mapping table
CREATE TABLE IF NOT EXISTS team_abbrev_map (
  league TEXT NOT NULL,
  api_abbrev TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (league, api_abbrev)
);
```

### Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_players_external_id ON players (external_id);
CREATE INDEX IF NOT EXISTS idx_games_api_game_id ON games (api_game_id);
CREATE INDEX IF NOT EXISTS idx_team_abbrev_map_lookup ON team_abbrev_map (league, api_abbrev);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_game_logs_unique 
ON player_game_logs (player_id, game_id, prop_type);
```

## 🔧 Core Functions

### 1. Game UUID Resolution

```typescript
async function getGameUUID(db, apiGameId: string) {
  const game = await db.query.games.findFirst({ 
    where: eq(games.apiGameId, apiGameId) 
  });
  if (!game) throw new Error(`Game ${apiGameId} not found`);
  return game.id;
}
```

### 2. Player Upsert by External ID

```typescript
async function getOrCreatePlayer(db, extId: string, name: string, league: string, teamId?: string) {
  const existingPlayer = await db.query.players.findFirst({ 
    where: eq(players.externalId, extId) 
  });
  
  if (existingPlayer) return existingPlayer.id;
  
  // Create new player with proper schema
  const inserted = await db.insert(players).values({
    id: randomUUID(),
    externalId: extId,
    firstName: name.split(' ')[0] || '',
    lastName: name.split(' ').slice(1).join(' ') || '',
    fullName: name,
    position: 'Unknown',
    positionCategory: 'Unknown',
    teamId: teamId || null,
    isActive: true
  }).returning({ id: players.id });
  
  return inserted[0].id;
}
```

### 3. Team ID Resolution

```typescript
async function resolveTeamId(db, league: string, apiAbbrev: string) {
  const result = await sql`
    SELECT team_id FROM team_abbrev_map 
    WHERE league = ${league} AND api_abbrev = ${apiAbbrev} 
    LIMIT 1
  `;
  
  if (!result[0]) {
    throw new Error(`Missing team mapping ${league}:${apiAbbrev}`);
  }
  
  return result[0].team_id;
}
```

## 🌐 API Integration

### Browser-like Headers

```typescript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nba.com/',
  'Origin': 'https://www.nba.com',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};
```

### Retry Logic with Exponential Backoff

```typescript
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 📥 Ingestion Pipeline

### Single Game Ingestion

```typescript
async function ingestGameBoxscore(db, apiGameId: string, league = 'NBA') {
  const data = await fetchWithRetry(
    `https://stats.nba.com/stats/boxscoretraditionalv2?GameID=${apiGameId}&StartPeriod=0&EndPeriod=14`
  );

  const playerSet = data.resultSets.find((s: any) => 
    (s.name || '').toLowerCase().includes('player')
  );
  
  const headers = playerSet.headers;
  const rows = playerSet.rowSet;

  for (const row of rows) {
    const player = toObj(row);
    const apiPlayerId = String(player.PLAYER_ID);
    const playerName = player.PLAYER_NAME;
    const teamAbbrev = player.TEAM_ABBREVIATION;

    // Skip if player didn't play
    if (!player.MIN || player.MIN === '') continue;

    await insertPlayerLog(db, apiGameId, apiPlayerId, playerName, league, teamAbbrev, {
      MIN: player.MIN, PTS: player.PTS, REB: player.REB, AST: player.AST, 
      STL: player.STL, BLK: player.BLK, TOV: player.TOV
    });
  }
}
```

### Batch Processing with Observability

```typescript
async function ingestAllGames(db, gameIds: string[], league = 'NBA') {
  let inserted = 0, failed = 0;
  const startTime = Date.now();

  for (const gameId of gameIds) {
    try {
      await ingestGameBoxscore(db, gameId, league);
      inserted++;
    } catch (error: any) {
      failed++;
      console.error(`Game ingestion failed for ${gameId}:`, error.message);
    }

    // Throttle requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const duration = Date.now() - startTime;
  console.log('Batch complete:', {
    gamesProcessed: gameIds.length,
    inserted,
    failed,
    duration: `${(duration / 1000).toFixed(1)}s`
  });
}
```

## 🧪 Testing & Validation

### Test Suite

Run the comprehensive test suite:

```bash
npm run player-logs:test
```

The test suite validates:
- Database schema integrity
- API connectivity
- Resilient lookup functions
- Full ingestion pipeline

### Debug Single Game

Test with a specific game:

```bash
npm run player-logs:debug 0022400456 NBA
```

### Batch Processing

Process multiple games:

```bash
npm run player-logs:batch "0022400456,0022400457,0022400458" NBA
```

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
# Apply the schema migration
psql $DATABASE_URL -f supabase/migrations/20250104_player_logs_ingestion_schema.sql
```

### 2. Verify Schema

```bash
# Run the test suite to validate everything is working
npm run player-logs:test
```

### 3. Test with Real Data

```bash
# Test with a known game ID
npm run player-logs:debug 0022400456 NBA
```

### 4. Batch Processing

```bash
# Process multiple games (replace with actual game IDs)
npm run player-logs:batch "0022400456,0022400457" NBA
```

## 🛠️ WNBA Team Mappings

The system includes comprehensive WNBA team abbreviation mappings to handle API variations:

```sql
INSERT INTO team_abbrev_map (league, api_abbrev, team_id)
VALUES
  ('WNBA','PHO',(SELECT id FROM teams WHERE name='Phoenix Mercury')),
  ('WNBA','PHX',(SELECT id FROM teams WHERE name='Phoenix Mercury')),
  ('WNBA','LAS',(SELECT id FROM teams WHERE name='Los Angeles Sparks')),
  ('WNBA','LA',(SELECT id FROM teams WHERE name='Los Angeles Sparks')),
  ('WNBA','CON',(SELECT id FROM teams WHERE name='Connecticut Sun')),
  ('WNBA','CT',(SELECT id FROM teams WHERE name='Connecticut Sun')),
  ('WNBA','NYL',(SELECT id FROM teams WHERE name='New York Liberty')),
  ('WNBA','NY',(SELECT id FROM teams WHERE name='New York Liberty')),
  ('WNBA','LVA',(SELECT id FROM teams WHERE name='Las Vegas Aces')),
  ('WNBA','LV',(SELECT id FROM teams WHERE name='Las Vegas Aces'));
```

## 📈 Monitoring & Observability

The system provides comprehensive logging and metrics:

- **Request tracking** - Each API call is logged with timing
- **Error handling** - Detailed error messages with context
- **Progress reporting** - Real-time status updates during batch processing
- **Performance metrics** - Duration, success/failure rates, throughput

## 🔒 Error Handling

The system implements multiple layers of error handling:

1. **API Level** - Retry logic with exponential backoff
2. **Data Level** - Validation of required fields
3. **Database Level** - Conflict resolution with `onConflictDoNothing`
4. **Application Level** - Comprehensive error logging and graceful degradation

## 📋 Usage Examples

### Debug Mode
```bash
npm run player-logs:debug 0022400456 NBA
```

### Batch Processing
```bash
npm run player-logs:batch "0022400456,0022400457,0022400458" NBA
```

### WNBA Processing
```bash
npm run player-logs:debug 401550000 WNBA
npm run player-logs:batch "401550000,401550001" WNBA
```

## 🎯 Key Features

- ✅ **Resilient Lookups** - Safe game/player/team resolution
- ✅ **Browser-like Headers** - Proper API request formatting
- ✅ **Retry Logic** - Exponential backoff for failed requests
- ✅ **Team Mapping** - Handles PHO/PHX and other API variations
- ✅ **Validation** - Strict data validation and error handling
- ✅ **Observability** - Comprehensive logging and metrics
- ✅ **Testing** - Full test suite for validation
- ✅ **Documentation** - Complete usage guide and examples

The system is production-ready and can handle both NBA and WNBA data ingestion with proper error handling, validation, and observability.
