# 🏗️ StatPedia Prop Ingestion System

## Overview
Complete prop ingestion system that fetches from SportsGameOdds API and inserts clean, normalized data into your Neon database while preserving team mapping and logos.

## ✨ Features

### ✅ **Smart Data Processing**
- **League-aware**: Automatically maps players to correct leagues (NFL, NBA, MLB, etc.)
- **Team preservation**: Maintains your existing team mapping and logos
- **Injury filtering**: Skips injured/inactive players automatically
- **Prop normalization**: Converts API prop types to human-readable names

### ✅ **Database Integration**
- **Clean schema**: Uses your existing `leagues → teams → players → props` structure
- **Foreign key relationships**: Properly links all entities
- **Conflict handling**: Uses `onConflictDoNothing()` for safe re-ingestion
- **Batch processing**: Efficient bulk inserts

### ✅ **API Integration**
- **SportsGameOdds API**: Fetches live prop data
- **Multi-sport support**: NFL, NBA, MLB, NHL, WNBA, CBB
- **Error handling**: Robust error handling and logging

## 🚀 Quick Start

### 1. **Set up Environment Variables**
```bash
# Add to your .env.local file
SPORTSGAMEODDS_API_KEY="your_api_key_here"
NEON_DATABASE_URL="your_neon_connection_string"
HASURA_ADMIN_SECRET="your_hasura_secret"
```

### 2. **Update Hasura Schema**
```bash
# Update Hasura to track props table with relationships
node scripts/update-hasura-props.js
```

### 3. **Run Prop Ingestion**
```bash
# Ingest NFL props
npm run ingest:props nfl

# Ingest NBA props with clearing old data
npm run ingest:props nba --clear

# Ingest all sports
npm run ingest:props all
```

## 📊 Prop Type Normalization

The system automatically converts API prop types to readable names:

### NFL Props
- `passing_yards` → "Passing Yards"
- `rushing_yards` → "Rushing Yards" 
- `receiving_yards` → "Receiving Yards"
- `receptions` → "Receptions"
- `passing_tds` → "Passing Touchdowns"

### NBA Props
- `points` → "Points"
- `rebounds` → "Rebounds"
- `assists` → "Assists"
- `three_pointers_made` → "Three Pointers Made"

### MLB Props
- `hits` → "Hits"
- `home_runs` → "Home Runs"
- `rbis` → "RBIs"
- `strikeouts` → "Strikeouts"

## 🗄️ Database Schema

### Tables Structure
```sql
-- Leagues (NFL, NBA, MLB, etc.)
leagues (id, code, name)

-- Teams with logos
teams (id, league_id, name, abbreviation, logo_url)

-- Players with status
players (id, team_id, name, position, status)

-- Props with relationships
props (id, player_id, team_id, game_id, prop_type, line, odds)
```

### Relationships
- `props.player_id` → `players.id`
- `props.team_id` → `teams.id`
- `players.team_id` → `teams.id`
- `teams.league_id` → `leagues.id`

## 🔧 API Usage

### Basic Ingestion
```typescript
import { ingestProps } from './src/services/prop-ingestion-service';

// Ingest NFL props
await ingestProps('nfl');

// Ingest all sports
await ingestAllSports();
```

### With Error Handling
```typescript
try {
  await ingestProps('nfl');
  console.log('✅ NFL props ingested successfully');
} catch (error) {
  console.error('❌ Ingestion failed:', error);
}
```

### Clear and Re-ingest
```typescript
import { clearOldProps, ingestProps } from './src/services/prop-ingestion-service';

// Clear old props first
await clearOldProps('nfl');

// Then ingest fresh data
await ingestProps('nfl');
```

## 🎯 GraphQL Queries

After ingestion, you can query props with full relationships:

```graphql
query GetLeagueAwareProps {
  props {
    id
    prop_type
    line
    odds
    player {
      name
      position
      team {
        name
        abbreviation
        logo_url
        league {
          code
          name
        }
      }
    }
  }
}
```

### Filter by Sport
```graphql
query GetNFLProps {
  props(where: {
    player: {
      team: {
        league: {
          code: { _eq: "NFL" }
        }
      }
    }
  }) {
    prop_type
    line
    odds
    player {
      name
      team {
        abbreviation
        logo_url
      }
    }
  }
}
```

## 🛠️ Scripts Reference

### Package.json Scripts
```bash
# Ingest props for specific sport
npm run ingest:props nfl
npm run ingest:props nba
npm run ingest:props mlb

# Clear old props before ingesting
npm run ingest:props nfl --clear

# Ingest all sports
npm run ingest:props all

# Update Hasura schema
node scripts/update-hasura-props.js
```

### Direct Script Usage
```bash
# Using tsx directly
tsx scripts/ingest-props.ts nfl
tsx scripts/ingest-props.ts nba --clear
tsx scripts/ingest-props.ts all

# Update Hasura
node scripts/update-hasura-props.js
```

## 🔍 Monitoring & Debugging

### Check Ingestion Results
```sql
-- Check total props by sport
SELECT 
  l.code as league,
  COUNT(p.id) as prop_count
FROM props p
JOIN players pl ON p.player_id = pl.id
JOIN teams t ON pl.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY l.code
ORDER BY prop_count DESC;

-- Check props by team
SELECT 
  t.abbreviation,
  l.code as league,
  COUNT(p.id) as prop_count
FROM props p
JOIN teams t ON p.team_id = t.id
JOIN leagues l ON t.league_id = l.id
GROUP BY t.abbreviation, l.code
ORDER BY prop_count DESC;
```

### Verify Team Logos
```sql
-- Check teams with logos
SELECT 
  l.code as league,
  t.abbreviation,
  t.name,
  t.logo_url
FROM teams t
JOIN leagues l ON t.league_id = l.id
WHERE t.logo_url IS NOT NULL
ORDER BY l.code, t.abbreviation;
```

## 🚨 Troubleshooting

### Common Issues

1. **API Key Not Working**
   ```bash
   # Check your API key
   echo $SPORTSGAMEODDS_API_KEY
   ```

2. **Database Connection Issues**
   ```bash
   # Test Neon connection
   psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM leagues;"
   ```

3. **Hasura Not Tracking Props**
   ```bash
   # Re-run Hasura setup
   node scripts/update-hasura-props.js
   ```

4. **No Props Showing in Frontend**
   ```bash
   # Check if props exist
   psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM props;"
   ```

### Debug Mode
```typescript
// Enable detailed logging
process.env.DEBUG = 'true';
await ingestProps('nfl');
```

## 📈 Performance Tips

1. **Batch Processing**: The system processes props in batches for efficiency
2. **Conflict Resolution**: Uses `onConflictDoNothing()` to avoid duplicates
3. **Selective Ingestion**: Only ingest sports you need
4. **Clear Before Re-ingest**: Use `--clear` flag for fresh data

## 🔄 Automation

### Cron Job Setup
```bash
# Add to crontab for daily ingestion
0 9 * * * cd /path/to/statpedia-08 && npm run ingest:props nfl
0 10 * * * cd /path/to/statpedia-08 && npm run ingest:props nba
```

### GitHub Actions
```yaml
name: Daily Prop Ingestion
on:
  schedule:
    - cron: '0 9 * * *' # 9 AM UTC daily
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run ingest:props all
        env:
          SPORTSGAMEODDS_API_KEY: ${{ secrets.SPORTS_API_KEY }}
          NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
```

## ✅ Verification Checklist

After running ingestion, verify:

- [ ] Props table has data: `SELECT COUNT(*) FROM props;`
- [ ] Team logos still work in frontend
- [ ] GraphQL queries return props with relationships
- [ ] No injured players in results
- [ ] Prop types are human-readable
- [ ] League-aware filtering works

Your StatPedia platform now has a robust, scalable prop ingestion system! 🚀
