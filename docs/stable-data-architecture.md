# Stable Data Architecture: Player Props Normalization

This document explains the new stable architecture that eliminates the "fixing the same things over and over" problem by creating proper boundaries between ingestion, normalization, and presentation layers.

## 🎯 Problem Solved

**Before**: Every change to player props rippled through the entire stack because:
- No single source of truth for player names, team logos, odds
- Tight coupling between ingestion, enrichment, and frontend rendering
- No regression safety net - changes felt like gambles
- Raw API strings leaked into props and enrichment

**After**: Stable boundaries with:
- Canonical mapping tables as single source of truth
- Normalization layer that always joins to canonical data
- Frontend only queries normalized view
- Automated tests and monitoring for regression safety

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Ingestion     │───▶│  Canonical Maps │───▶│  Normalization  │
│   (Raw APIs)    │    │  (Single Source) │    │     Layer       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Test Harness    │    │   Frontend      │
                       │  (Golden Data)   │    │  (Stable View)  │
                       └──────────────────┘    └─────────────────┘
```

## 📊 Canonical Mapping Tables

### 1. Players Table
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  external_id TEXT UNIQUE,  -- API player ID
  display_name TEXT,        -- Canonical display name
  team_id UUID REFERENCES teams(id),
  league TEXT,              -- nfl, nba, mlb, nhl
  position TEXT,
  is_active BOOLEAN
);
```

### 2. Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  league TEXT,
  name TEXT,                -- "Green Bay Packers"
  abbreviation TEXT,         -- "GB"
  logo_url TEXT,
  aliases JSONB,            -- ["packers", "green bay"]
  is_active BOOLEAN
);
```

### 3. Sportsbooks Table
```sql
CREATE TABLE sportsbooks (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,         -- "DraftKings", "FanDuel"
  api_key TEXT,
  is_active BOOLEAN
);
```

### 4. Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  external_id TEXT UNIQUE,   -- API game ID
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  league TEXT,
  game_date TIMESTAMP,
  season INTEGER,
  week INTEGER
);
```

## 🔄 Normalization Layer

### Player Props Normalized View
```sql
CREATE VIEW player_props_normalized AS
SELECT 
    pp.id AS prop_id,
    pp.game_id,
    g.game_date,
    pp.market,
    pp.line,
    pp.odds,
    pp.ev_percent,
    
    -- Player info (canonical)
    p.id AS player_id,
    p.display_name AS player_name,
    p.external_id AS api_player_id,
    
    -- Team info (canonical)
    t.id AS team_id,
    t.name AS team_name,
    t.abbreviation AS team_abbrev,
    t.logo_url AS team_logo,
    
    -- Opponent info (canonical)
    ot.id AS opponent_id,
    ot.name AS opponent_name,
    ot.abbreviation AS opponent_abbrev,
    ot.logo_url AS opponent_logo,
    
    -- Sportsbook info (canonical)
    sb.id AS sportsbook_id,
    sb.name AS sportsbook_name
    
FROM player_props pp
JOIN players p ON p.id = pp.player_id
JOIN games g ON g.id = pp.game_id
JOIN teams t ON t.id = p.team_id
JOIN teams ot ON ot.id = CASE 
    WHEN g.home_team_id = p.team_id THEN g.away_team_id 
    ELSE g.home_team_id 
END
JOIN sportsbooks sb ON sb.id = pp.sportsbook_id
WHERE pp.is_active = true;
```

## 🧪 Golden Dataset & Testing

### Test Harness
```sql
-- Run golden dataset tests
SELECT * FROM run_golden_dataset_tests();

-- Check ingestion health
SELECT * FROM get_ingestion_health_status();

-- Get ingestion summary
SELECT * FROM get_ingestion_summary();
```

### Golden Dataset Examples
```sql
INSERT INTO golden_dataset (test_name, player_name, team_abbrev, market, league) VALUES
('joe_burrow_passing_yards', 'Joe Burrow', 'CIN', 'Passing Yards', 'nfl'),
('jamarr_chase_receiving_yards', 'Ja''Marr Chase', 'CIN', 'Receiving Yards', 'nfl');
```

## 🔧 Data Ingestion Service

### Bulk Upsert Function
```sql
-- Ingest props while maintaining referential integrity
SELECT * FROM bulk_upsert_player_props(
  '[{"player_id": "JOE_BURROW", "team": "CIN", "market": "Passing Yards", "line": 250.5, "odds": -110}]'::jsonb,
  'batch_123'
);
```

### Resolution Functions
```sql
-- Resolve player by external ID or name
SELECT resolve_player('JOE_BURROW', 'CIN', 'nfl');

-- Resolve team by abbreviation
SELECT resolve_team('CIN', 'nfl');

-- Resolve sportsbook by name
SELECT resolve_sportsbook('DraftKings');
```

## 🎨 Frontend Integration

### Using the Normalized Service
```typescript
import { PlayerPropsNormalizedService } from '@/services/player-props-normalized-service';

// Get normalized player props
const props = await PlayerPropsNormalizedService.getPlayerProps({
  sport: 'nfl',
  team_abbrev: 'CIN',
  limit: 50
});

// All data is guaranteed to be resolved:
// - props[0].player_name (never "Unknown Player")
// - props[0].team_logo (never null)
// - props[0].odds (always numeric)
```

### Component Example
```typescript
export const PlayerPropCard: React.FC<{prop: NormalizedPlayerProp}> = ({prop}) => {
  return (
    <div>
      {/* Player name is guaranteed to be resolved */}
      <h3>{prop.player_name}</h3>
      
      {/* Team logo is guaranteed to exist */}
      <img src={prop.team_logo} alt={prop.team_name} />
      
      {/* Odds are guaranteed to be numeric */}
      <span>{prop.odds > 0 ? '+' : ''}{prop.odds}</span>
    </div>
  );
};
```

## 📈 Monitoring & Observability

### Ingestion Health Check
```typescript
const health = await PlayerPropsNormalizedService.getIngestionHealth();
// Returns: { status: 'healthy'|'warning'|'error', message: string, details: {...} }
```

### Test Results
```typescript
const testResults = await PlayerPropsNormalizedService.runGoldenDatasetTests();
// Returns array of test results with pass/fail status
```

### Ingestion Summary
```typescript
const summary = await PlayerPropsNormalizedService.getIngestionSummary();
// Returns: { total_props, resolved_players, failed_players, total_teams, last_updated }
```

## 🚀 Migration Steps

### 1. Run Database Migrations
```bash
# Apply the canonical mapping tables
psql -f supabase/migrations/20250115_canonical_mapping_tables.sql

# Apply the normalized view
psql -f supabase/migrations/20250115_player_props_normalized_view.sql

# Apply the test harness
psql -f supabase/migrations/20250115_golden_dataset_tests.sql

# Apply the ingestion service
psql -f supabase/migrations/20250115_ingestion_service.sql
```

### 2. Update Frontend Components
```typescript
// Replace direct database queries with normalized service
// OLD:
const { data } = await supabase.from('player_props').select('*');

// NEW:
const data = await PlayerPropsNormalizedService.getPlayerProps();
```

### 3. Update Data Ingestion
```typescript
// Use bulk upsert function instead of direct inserts
// OLD:
await supabase.from('player_props').insert(rawProps);

// NEW:
await supabase.rpc('bulk_upsert_player_props', {
  props_data: JSON.stringify(normalizedProps),
  batch_id: 'batch_' + Date.now()
});
```

### 4. Add Health Monitoring
```typescript
// Add health checks to your admin dashboard
const health = await PlayerPropsNormalizedService.getIngestionHealth();
if (health.status !== 'healthy') {
  // Alert administrators
}
```

## ✅ Benefits

1. **Single Source of Truth**: Player names, team logos, odds flow from canonical tables
2. **Stable Boundaries**: Changes to ingestion don't affect presentation
3. **Regression Safety**: Golden dataset tests catch breaking changes immediately
4. **Observability**: Real-time monitoring of ingestion health and success rates
5. **Data Quality**: Guaranteed resolution of all display data
6. **Maintainability**: Clear separation of concerns between layers

## 🔍 Troubleshooting

### Common Issues

1. **"Unknown Player" still appearing**
   - Check if player exists in canonical `players` table
   - Verify `external_id` mapping is correct
   - Run `resolve_player()` function to test resolution

2. **Missing team logos**
   - Check if team exists in canonical `teams` table
   - Verify `logo_url` is populated
   - Run `resolve_team()` function to test resolution

3. **Test failures**
   - Run `run_golden_dataset_tests()` to see specific failures
   - Check `ingestion_errors` table for detailed error messages
   - Verify all canonical tables are populated

4. **Ingestion health warnings**
   - Check `ingestion_logs` table for recent batch results
   - Review `ingestion_errors` table for specific error types
   - Verify all resolution functions are working correctly

### Debug Queries

```sql
-- Check if a specific player is resolved
SELECT * FROM players WHERE display_name ILIKE '%joe burrow%';

-- Check if a specific team is resolved
SELECT * FROM teams WHERE abbreviation = 'CIN';

-- Check recent ingestion errors
SELECT * FROM ingestion_errors ORDER BY created_at DESC LIMIT 10;

-- Check test results
SELECT * FROM test_results ORDER BY created_at DESC LIMIT 10;
```

## 📚 Next Steps

1. **Expand Golden Dataset**: Add more test cases for different leagues and prop types
2. **Add More Leagues**: Extend team mappings to NBA, MLB, NHL
3. **Enhanced Monitoring**: Add alerts for ingestion failures
4. **Performance Optimization**: Add more indexes based on query patterns
5. **Data Validation**: Add constraints to ensure data quality

This architecture ensures that you'll never have to "fix the same things over and over" again. Once a player name or team logo is resolved in the canonical tables, it's resolved everywhere. The normalization layer provides a stable interface that the frontend can rely on, and the test harness catches any regressions before they reach production.
