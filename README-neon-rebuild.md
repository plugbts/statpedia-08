# 🏗️ StatPedia Neon Schema Rebuild

## Overview
Clean, normalized schema for leagues → teams → players → props with Hasura GraphQL API.

## 📁 Files Created

### 1. `neon-schema-rebuild.sql`
Complete schema with:
- **leagues** table (NFL, NBA, MLB, WNBA, NHL, CBB)
- **teams** table with league relationships and logo URLs
- **players** table with team relationships
- **props** table with player and team relationships
- Indexes and triggers for performance

### 2. `seed-leagues.sql`
Seeds the 6 major sports leagues:
- NFL (National Football League)
- NBA (National Basketball Association) 
- MLB (Major League Baseball)
- WNBA (Women's National Basketball Association)
- NHL (National Hockey League)
- CBB (College Basketball)

### 3. `seed-teams.sql`
Seeds teams for each league with:
- Team names and abbreviations
- Logo URLs (placeholder structure)
- League relationships via foreign keys

### 4. `hasura-relationships-setup.sql`
Instructions for setting up Hasura relationships:
- Object relationships (teams.league, players.team, props.player, props.team)
- Array relationships (leagues.teams, teams.players, teams.props, players.props)

### 5. `example-graphql-queries.graphql`
Ready-to-use GraphQL queries:
- League-aware props with nested relationships
- Filtered queries by league, team, prop type
- Insert mutations for props and players

## 🚀 Implementation Steps

### Step 1: Apply Schema to Neon
```bash
# Connect to your Neon database and run:
psql $NEON_DATABASE_URL -f neon-schema-rebuild.sql
```

### Step 2: Seed Data
```bash
# Seed leagues
psql $NEON_DATABASE_URL -f seed-leagues.sql

# Seed teams
psql $NEON_DATABASE_URL -f seed-teams.sql
```

### Step 3: Update Hasura
1. Go to Hasura Console: https://graphql-engine-latest-statpedia.onrender.com/console
2. Track the new tables: `leagues`, `teams`, `players`, `props`
3. Set up relationships following `hasura-relationships-setup.sql`
4. Configure permissions for anonymous role

### Step 4: Test GraphQL API
Use queries from `example-graphql-queries.graphql` to test:
- League-aware prop queries
- Nested team and player relationships
- Insert mutations

## 🎯 Key Benefits

### ✅ League-Aware
Every team belongs to a league, enabling easy filtering by sport.

### ✅ Logo URLs
Stored once per team, reusable across all queries and UI components.

### ✅ Hasura Relationships
Automatic nested GraphQL queries with zero configuration.

### ✅ Future-Proof
Add new leagues or teams without schema changes.

### ✅ Normalized
Clean foreign key relationships prevent data duplication.

## 📊 Schema Structure

```
leagues (1) ←→ (many) teams (1) ←→ (many) players
   ↓                                    ↓
   └── (many) props ←───────────────────┘
```

## 🔍 Example Query Result

```json
{
  "props": [
    {
      "prop_type": "Receptions",
      "line": 4.5,
      "odds": "-115",
      "player": {
        "name": "Troy Franklin",
        "position": "WR",
        "team": {
          "abbreviation": "LAL",
          "logo_url": "https://cdn.yoursite.com/logos/nba/lal.png",
          "league": {
            "code": "NBA",
            "name": "National Basketball Association"
          }
        }
      }
    }
  ]
}
```

## 🛠️ Next Steps

1. **Update Logo URLs**: Replace placeholder URLs with actual CDN links
2. **Add More Teams**: Expand team rosters for each league
3. **Seed Players**: Add actual player data with positions
4. **Seed Props**: Add real prop betting data
5. **Frontend Integration**: Connect your React app to the GraphQL API

Your StatPedia platform now has a clean, scalable database architecture ready for production! 🚀
