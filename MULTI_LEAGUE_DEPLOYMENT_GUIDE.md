# Multi-League Props Ingestion System - Deployment Guide

## Overview
This system expands the props ingestion to support **all major leagues** (NFL, NBA, MLB, NHL, EPL, NCAAF, NCAAB) with comprehensive analytics including Hit Rate, H2H, L5, L10, L20, and Matchup Rankings.

## 🎯 **Key Features**

### Multi-League Support
- **7 Leagues**: NFL, NBA, MLB, NHL, EPL, NCAAF, NCAAB
- **Season-Aware**: Only processes leagues currently in season
- **League-Specific Markets**: Tailored prop types for each sport
- **Fallback Logic**: Resilient API calls with multiple fallback strategies

### Comprehensive Analytics
- **Hit Rates**: L5, L10, L20, Season, H2H vs opponents
- **Streak Analysis**: Current streaks and performance trends
- **Matchup Rankings**: Opponent defensive rankings (1-32)
- **Value Indicators**: Smart recommendations based on margin analysis
- **Performance Trends**: Hot/Cold/Average classifications

### Advanced Features
- **Dynamic Player Loading**: Auto-loads from Supabase players table
- **Missing Player Tracking**: Logs unmapped players for reconciliation
- **Batch Processing**: Efficient 500-row chunks with retry logic
- **Cron Scheduling**: Every 10 minutes for all leagues
- **Real-time Analytics**: Live analytics view with window functions

## 📁 **Files Created/Modified**

### Core Implementation
- `src/multiLeagueWorker.ts` - Main worker with multi-league support
- `src/leagueConfig.ts` - League configurations and market mappings
- `src/api.ts` - Resilient API fetcher with fallback logic

### Database Schema
- `supabase/migrations/20250103000011_create_analytics_view.sql` - Comprehensive analytics view

### Testing & Utilities
- `test-multi-league.js` - End-to-end testing script
- `wrangler.toml` - Updated with 10-minute cron schedule

## 🚀 **Deployment Steps**

### 1. Deploy Database Analytics View
```bash
# Apply the analytics view migration
# Run this in Supabase SQL Editor:
```
```sql
-- Copy contents of supabase/migrations/20250103000011_create_analytics_view.sql
-- This creates the comprehensive player_prop_analytics view
```

### 2. Deploy Multi-League Worker
```bash
cd cloudflare-worker
wrangler deploy
```

### 3. Test Multi-League System
```bash
node test-multi-league.js
```

## 📊 **League Configuration**

### Supported Leagues
```typescript
const LEAGUES = [
  { id: "NFL", season: 2025, sport: "FOOTBALL", oddIDs: "rushing_yards-PLAYER_ID-game-ou-over,..." },
  { id: "NBA", season: 2025, sport: "BASKETBALL", oddIDs: "points-PLAYER_ID-game-ou-over,..." },
  { id: "MLB", season: 2025, sport: "BASEBALL", oddIDs: "hits-PLAYER_ID-game-ou-over,..." },
  { id: "NHL", season: 2025, sport: "HOCKEY", oddIDs: "shots_on_goal-PLAYER_ID-game-ou-over,..." },
  { id: "EPL", season: 2025, sport: "SOCCER", oddIDs: "goals-PLAYER_ID-game-ou-over,..." },
  { id: "NCAAF", season: 2025, sport: "FOOTBALL", oddIDs: "rushing_yards-PLAYER_ID-game-ou-over,..." },
  { id: "NCAAB", season: 2025, sport: "BASKETBALL", oddIDs: "points-PLAYER_ID-game-ou-over,..." }
];
```

### League-Specific Markets
Each league has tailored prop types:
- **NFL**: Rushing Yards, Passing Yards, Receiving Yards, Touchdowns
- **NBA**: Points, Rebounds, Assists, Steals, Blocks
- **MLB**: Hits, Runs, RBIs, Strikeouts, Home Runs
- **NHL**: Shots on Goal, Goals, Assists, Points
- **EPL**: Goals, Assists, Shots, Cards
- **NCAAF/NCAAB**: Similar to pro leagues with appropriate markets

## 📈 **Analytics View Features**

### Hit Rate Calculations
```sql
-- L5 Hit Rate (Last 5 games)
AVG(hit) OVER (PARTITION BY player_id, prop_type ORDER BY date DESC ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)

-- L10 Hit Rate (Last 10 games)  
AVG(hit) OVER (PARTITION BY player_id, prop_type ORDER BY date DESC ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)

-- L20 Hit Rate (Last 20 games)
AVG(hit) OVER (PARTITION BY player_id, prop_type ORDER BY date DESC ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)

-- H2H Hit Rate vs specific opponent
AVG(hit) FILTER (WHERE opponent_id = game_opponent) OVER (PARTITION BY player_id, prop_type, game_opponent)
```

### Matchup Rankings
```sql
-- Defensive rank (1-32, lower = better defense)
NTILE(32) OVER (PARTITION BY prop_type, league ORDER BY AVG(actual_value) DESC) as defensive_rank
```

### Performance Indicators
- **Performance Trend**: Hot/Cold/Average based on L10 hit rate
- **Value Indicator**: Strong Over/Under/Neutral based on margin analysis
- **Streak Direction**: Over/Under/Even with streak count

## 🔄 **API Endpoints**

### Worker Endpoints
- `GET /leagues` - Get active and in-season leagues
- `POST /ingest` - Trigger multi-league ingestion
- `GET /analytics?player_id=X&prop_type=Y` - Get player analytics

### Supabase Analytics
```typescript
// Query analytics via Worker
const analytics = await fetch(`${WORKER_URL}/analytics?player_id=LEBRON_JAMES-SF-LAL&prop_type=Points`);

// Or directly via Supabase
const analytics = await supabaseFetch(env, "player_prop_analytics", {
  query: "?player_id=eq.LEBRON_JAMES-SF-LAL&prop_type=eq.Points&order=date.desc&limit=1"
});
```

## 📊 **Fallback Strategy**

### Tiered Fallbacks for Each League
1. **Primary**: Current season with date range
2. **Fallback A**: Widened date range (±14 days)
3. **Fallback B**: Switch to last season
4. **Fallback C**: Minimal filters (leagueID + oddsAvailable=true)

### Resilient Processing
- **Error Handling**: Try/catch with retry logic
- **Batch Processing**: 500-row chunks with conflict resolution
- **Logging**: Comprehensive per-league logging
- **Monitoring**: Success/error counts per league

## 🎯 **Expected Results**

### Ingestion Output
```
🚀 Starting multi-league ingestion...
📊 Found 7 leagues currently in season: NFL, NBA, MLB, NHL, EPL, NCAAF, NCAAB

🏈 Processing NFL (NFL)
📊 NFL: Fetched 15 events
✅ NFL: 45 props processed (42 inserted, 0 errors)

🏀 Processing NBA (NBA)  
📊 NBA: Fetched 8 events
✅ NBA: 32 props processed (30 inserted, 0 errors)

🎉 Multi-league ingestion complete:
📊 Total: 77 props, 72 inserted, 0 updated, 0 errors
```

### Analytics Output
```json
{
  "player_name": "LeBron James",
  "prop_type": "Points",
  "hit_rate_l5_pct": 80.0,
  "hit_rate_l10_pct": 70.0,
  "hit_rate_l20_pct": 65.0,
  "h2h_hit_rate_pct": 75.0,
  "matchup_defensive_rank": 8,
  "matchup_rank_display": "Top 10",
  "performance_trend": "Hot",
  "value_indicator": "Strong Over",
  "current_streak_count": 3,
  "streak_direction": "Over"
}
```

## 🔍 **Monitoring & Observability**

### Per-League Logging
```
[NFL] Event 12345: 3 props (3 inserted, 0 errors)
[NBA] Event 67890: 4 props (4 inserted, 0 errors)
[MLB] Event 11111: 2 props (2 inserted, 0 errors)
```

### Analytics Monitoring
```sql
-- Check analytics view population
SELECT 
  league,
  COUNT(*) as total_records,
  AVG(hit_rate_l10_pct) as avg_l10_hit_rate,
  COUNT(CASE WHEN performance_trend = 'Hot' THEN 1 END) as hot_players
FROM player_prop_analytics 
GROUP BY league;
```

## ✅ **Success Criteria**

1. **Multi-League Ingestion**: All 7 leagues processed successfully
2. **Analytics Population**: Analytics view populated with hit rates and rankings
3. **Fallback Logic**: System handles API failures gracefully
4. **Performance**: Ingestion completes within 2-3 minutes
5. **Data Quality**: >90% props successfully inserted with proper mappings

## 🚀 **Next Steps**

1. **UI Integration**: Build components to display analytics
2. **Caching**: Add Redis caching for frequently accessed analytics
3. **Alerts**: Set up monitoring alerts for ingestion failures
4. **Expansion**: Add more leagues (NCAAM, WNBA, etc.)
5. **Machine Learning**: Implement predictive models based on analytics

The multi-league system is now ready for production deployment with comprehensive analytics and resilient fallback logic! 🎉
