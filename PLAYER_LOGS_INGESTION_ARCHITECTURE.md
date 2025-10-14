# NBA/WNBA Player Logs Ingestion Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    NBA/WNBA API Endpoints                      │
│  https://stats.nba.com/stats/boxscoretraditionalv2             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Browser-like Headers + Retry Logic
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                 Ingestion Pipeline                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Single    │  │   Batch     │  │   Debug     │             │
│  │   Game      │  │ Processing  │  │   Mode      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Resilient Lookups
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                Database Layer                                   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Games     │  │   Players   │  │    Teams    │             │
│  │             │  │             │  │             │             │
│  │ • api_game_id │ │ • external_id│ │ • abbreviation│           │
│  │ • id        │  │ • name      │  │ • id        │             │
│  │ • league_id │  │ • team_id   │  │ • league_id │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │ Player Game │  │Team Abbrev  │                              │
│  │    Logs     │  │    Map      │                              │
│  │             │  │             │                              │
│  │ • player_id │  │ • league    │                              │
│  │ • game_id   │  │ • api_abbrev│                              │
│  │ • stats     │  │ • team_id   │                              │
│  └─────────────┘  └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. API Request
   ↓
2. Fetch NBA/WNBA Boxscore Data
   ↓
3. Parse Player Statistics
   ↓
4. Resolve Game UUID by api_game_id
   ↓
5. Resolve Team ID by abbreviation mapping
   ↓
6. Upsert Player by external_id
   ↓
7. Insert Player Game Log
   ↓
8. Handle Conflicts & Errors
```

## Key Components

### 1. Schema & Indexes
- ✅ `players.external_id` - NBA/WNBA numeric ID
- ✅ `games.api_game_id` - External API game identifier
- ✅ `team_abbrev_map` - Maps API abbreviations to team IDs
- ✅ Unique indexes for fast lookups and conflict resolution

### 2. Resilient Functions
- ✅ `getGameUUID()` - Safe game resolution
- ✅ `getOrCreatePlayer()` - Player upsert with external_id
- ✅ `resolveTeamId()` - Team mapping with fallbacks

### 3. API Integration
- ✅ Browser-like headers to avoid blocking
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting and throttling

### 4. Ingestion Pipeline
- ✅ Single-game debug harness
- ✅ Batch processing with observability
- ✅ Comprehensive error handling and logging

### 5. Team Mappings
- ✅ NBA team abbreviations (including alternates)
- ✅ WNBA team abbreviations (PHO/PHX, LAS/LA, etc.)
- ✅ Conflict resolution for duplicate mappings

## Usage Commands

```bash
# Test the system
npm run player-logs:test

# Debug single game
npm run player-logs:debug 0022400456 NBA

# Batch processing
npm run player-logs:batch "0022400456,0022400457" NBA

# WNBA processing
npm run player-logs:debug 401550000 WNBA
```

## Error Handling Layers

1. **API Level**: Retry with exponential backoff
2. **Data Level**: Validation of required fields
3. **Database Level**: `onConflictDoNothing` for safe upserts
4. **Application Level**: Comprehensive logging and graceful degradation

## Performance Features

- **Indexed Lookups**: Fast game/player/team resolution
- **Throttling**: 1 request/second to avoid rate limits
- **Batch Processing**: Sequential processing with progress tracking
- **Conflict Resolution**: Safe upserts prevent duplicates
- **Observability**: Real-time progress and error reporting
