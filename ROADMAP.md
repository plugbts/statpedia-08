# 🪜 Statpedia Data Pipeline Roadmap

**Last Updated**: November 12, 2025  
**Current Status**: Phase 1 - Production Ready for Player Props  
**Data Quality**: 95/100 ✅

---

## 🎯 Vision

Transform Statpedia from a player props tracking system into a comprehensive sports analytics platform with predictive betting edges across all major markets (props, spreads, totals, moneylines).

---

## 📊 Current State Assessment

### ✅ What's Working (95/100 Quality)
- **Player Props Pipeline**: 700K+ player game logs across 5 leagues
- **Team Normalization**: Zero duplicates, all canonical abbreviations
- **Logo Rendering**: 100% ESPN CDN coverage with correct casing
- **Date Ordering**: Chronological integrity verified (43 unique dates)
- **Historical Coverage**: 3,163 games (MLB: 2,954, NHL: 119, NFL: 71, WNBA: 18, NBA: 1)
- **Streak Calculation**: Prop hit/miss tracking with line comparisons
- **Data Validation**: 6-test suite passing (5 PASS, 1 WARNING)

### ⚠️ Known Gaps
- Game scores: NULL (games exist but scores not populated)
- Cross-team consistency: Player logs linked but score validation unavailable
- Official schedule verification: Not yet cross-referenced
- Spread/total markets: Not ingested
- Moneyline odds: Not ingested
- Possession/pace adjustments: Not calculated

### 📈 Maintenance Status
- 7 audit/validation scripts operational
- Daily monitoring recommended via `validate-data-quality.ts`
- Auto-merge duplicate teams on ingestion (via canonical mapping)
- Auto-generate logo URLs on team creation

---

## 🚀 Phase 1: Stabilize & Validate Props (NOW - Week 1-2)

### Objective
Lock down player props as the core product. Ensure production stability, data quality >95%, and frontend integration.

### Tasks

#### 1.1 Production Validation (Week 1)
- [ ] **Daily Audit Runs**: Schedule `validate-data-quality.ts` as cron job
  ```bash
  # Add to crontab for daily 6am run
  0 6 * * * cd /app && npx tsx scripts/validate-data-quality.ts >> logs/audit.log 2>&1
  ```
- [ ] **Alert System**: Send notifications if validation fails
- [ ] **Frontend Logo Test**: Verify all teams render correctly in UI
- [ ] **Streak Display Test**: Confirm player prop streaks match raw calculations

#### 1.2 Data Quality Maintenance (Week 1-2)
- [ ] **Monitor Duplicate Teams**: Weekly check via `audit-data-pipeline.ts`
- [ ] **Logo URL Health**: Verify ESPN CDN accessibility (check for 404s)
- [ ] **Date Integrity**: Ensure new ingestions maintain chronological order
- [ ] **Prop Hit Rate**: Calculate accuracy of line predictions vs actual outcomes

#### 1.3 Frontend Integration (Week 2)
- [ ] **Team Logos**: Ensure all normalized teams display in UI with correct logos
- [ ] **Player Cards**: Show prop history with streak indicators
- [ ] **Filter by League**: Test MLB, NBA, NFL, NHL, WNBA toggling
- [ ] **Date Range Selector**: Historical game log viewing

#### 1.4 Performance Optimization (Week 2)
- [ ] **Index player_game_logs**: Add index on `(player_id, game_date DESC)` for streak queries
- [ ] **Index games**: Add index on `(home_team_id, away_team_id, game_date)` for matchup queries
- [ ] **Cache popular players**: Redis layer for top 100 players' recent games

### Success Metrics
- ✅ Data quality remains >95% for 2 consecutive weeks
- ✅ Zero duplicate teams created during ingestion
- ✅ All frontend team logos render (0 broken images)
- ✅ Prop streak calculations match backend logic 100%
- ✅ Query response time <500ms for player game logs (P95)

### Deliverables
- ✅ `validate-data-quality.ts` running on schedule
- ✅ Alert system for validation failures
- ✅ Frontend QA report (logo rendering, streak display)
- ✅ Performance benchmarks documented

---

## 📈 Phase 2: Add Game Scores & Spreads (LATER - Week 3-6)

### Objective
Fill game score NULLs and expand to spread/total markets. Enable team-level betting analysis.

### Tasks

#### 2.1 Score Ingestion (Week 3)
- [ ] **ESPN Scoreboard API**: Ingest final scores for completed games
  ```typescript
  // Pseudo-code structure
  async function ingestGameScores(league: string, date: string) {
    const games = await espnApi.getScoreboard(league, date);
    for (const game of games) {
      await db.update(games)
        .set({ 
          home_score: game.homeScore, 
          away_score: game.awayScore,
          status: 'completed' 
        })
        .where({ espn_game_id: game.id });
    }
  }
  ```
- [ ] **Backfill Historical Scores**: Run script for all 3,163 games with NULL scores
- [ ] **Validation**: Cross-team consistency test should PASS (Test #6)

#### 2.2 Spread & Total Ingestion (Week 4)
- [ ] **SportsGameOdds API Integration**: Fetch spread/total lines at game time
  ```typescript
  interface GameOdds {
    gameId: string;
    spread: { home: number, away: number, line: number };
    total: { over: number, under: number, line: number };
    moneyline: { home: number, away: number };
  }
  ```
- [ ] **Create `game_odds` Table**: 
  ```sql
  CREATE TABLE game_odds (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id),
    spread_home NUMERIC(5,1),
    spread_away NUMERIC(5,1),
    spread_line NUMERIC(5,1),
    total_line NUMERIC(5,1),
    moneyline_home INTEGER,
    moneyline_away INTEGER,
    odds_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] **Historical Odds Backfill**: If available from SGO API

#### 2.3 Spread/Total Models (Week 5-6)
- [ ] **Win Probability Model**: Based on historical spread outcomes
  ```sql
  -- Example: Teams covering spread by margin
  SELECT 
    t.name,
    COUNT(*) as games,
    SUM(CASE WHEN (g.home_score - g.away_score) > go.spread_line THEN 1 ELSE 0 END) as covers,
    ROUND(100.0 * SUM(CASE WHEN (g.home_score - g.away_score) > go.spread_line THEN 1 ELSE 0 END) / COUNT(*), 1) as cover_rate
  FROM games g
  JOIN teams t ON t.id = g.home_team_id
  JOIN game_odds go ON go.game_id = g.id
  WHERE g.home_score IS NOT NULL
  GROUP BY t.name
  ORDER BY cover_rate DESC;
  ```
- [ ] **Total Trends**: Over/under hit rates by team, league, season
- [ ] **Home/Away Splits**: Separate models for home vs away performance

#### 2.4 Official Schedule Cross-Check (Week 6)
- [ ] **ESPN Schedule Scraper**: Fetch complete season schedules
- [ ] **Completeness Validation**: 
  ```typescript
  const officialGames = await espnApi.getSeasonSchedule('MLB', '2025');
  const ingestedGames = await db.select().from(games)
    .where(eq(league, 'MLB'), eq(season, '2025'));
  const missing = officialGames.filter(og => 
    !ingestedGames.some(ig => ig.espn_game_id === og.id)
  );
  console.log(`Missing ${missing.length} games out of ${officialGames.length}`);
  ```
- [ ] **Gap Fill Strategy**: Re-ingest missing games or identify data source issues

### Success Metrics
- ✅ 100% of games have non-NULL scores
- ✅ Spread/total lines ingested for current season games
- ✅ Cross-team consistency test PASSES (matching scores)
- ✅ <5% missing games vs official schedule per league
- ✅ Spread model covers at >52% (breakeven threshold)

### Deliverables
- ✅ `ingest-game-scores.ts` script running daily
- ✅ `game_odds` table populated with historical and current lines
- ✅ Spread/total accuracy report (cover rates, trends)
- ✅ Schedule completeness validation report

---

## 🔮 Phase 3: Betting Edges & Advanced Analytics (FUTURE - Week 7+)

### Objective
Build predictive models with betting edges. Integrate opponent adjustments, possession metrics, and multi-market analysis.

### Tasks

#### 3.1 Betting Edge Pipeline (Week 7-8)
- [ ] **Edge Detection Algorithm**:
  ```typescript
  interface BettingEdge {
    gameId: string;
    market: 'spread' | 'total' | 'moneyline' | 'prop';
    recommendedBet: string;
    expectedValue: number; // % edge over line
    confidence: number; // 0-100 scale
    factors: string[]; // ['team_hot_streak', 'opponent_weak_defense', etc.]
  }
  ```
- [ ] **Value Calculator**: Compare model predictions vs actual odds
  ```typescript
  const edge = (modelWinProb - impliedOddsProbability) * 100;
  if (edge > 5) return { bet: 'STRONG', edge };
  if (edge > 2) return { bet: 'MODERATE', edge };
  return { bet: 'PASS', edge };
  ```
- [ ] **Track Edge Performance**: Log actual outcomes vs predictions

#### 3.2 Opponent Adjustments (Week 9)
- [ ] **Defensive Ratings**: Calculate opponent strength vs position
  ```sql
  -- Example: Points allowed to opposing QBs
  SELECT 
    def_team.name,
    AVG(pgl.actual_value) as avg_pass_yards_allowed
  FROM player_game_logs pgl
  JOIN players p ON p.id = pgl.player_id
  JOIN teams def_team ON def_team.id = pgl.opponent_team_id
  WHERE pgl.prop_type = 'Passing Yards'
  GROUP BY def_team.name
  ORDER BY avg_pass_yards_allowed DESC;
  ```
- [ ] **Matchup Adjustments**: Modify player prop projections based on opponent
- [ ] **Rest Days Impact**: Factor in back-to-back games, travel

#### 3.3 Possession & Pace Normalization (Week 10)
- [ ] **Pace Metrics**: 
  - NBA: Possessions per game
  - NFL: Plays per game, time of possession
  - MLB: Innings pitched, plate appearances
- [ ] **Normalize Props by Pace**:
  ```typescript
  const paceFactor = teamPace / leagueAvgPace;
  const adjustedProjection = baseProjection * paceFactor;
  ```
- [ ] **Game Script Scenarios**: Leading vs trailing impact on usage

#### 3.4 Multi-Market API Endpoints (Week 11-12)
- [ ] **Unified Betting API**:
  ```typescript
  GET /api/betting/edges
  Query Params: 
    - market: 'props' | 'spread' | 'total' | 'moneyline' | 'all'
    - league: 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'WNBA'
    - minEdge: number (default: 2)
    - date: string
  
  Response:
  {
    edges: BettingEdge[],
    summary: {
      totalOpportunities: number,
      avgEdge: number,
      highConfidenceCount: number
    }
  }
  ```
- [ ] **Frontend Market Toggle**: Switch between props, spreads, totals
- [ ] **Unified Dashboard**: Show all betting opportunities in one view

#### 3.5 Machine Learning Models (Week 13+)
- [ ] **XGBoost for Props**: Train on historical hit rates with features:
  - Recent form (L5, L10, L20)
  - Opponent strength
  - Home/away
  - Rest days
  - Weather (outdoor sports)
- [ ] **Neural Network for Spreads**: Deep learning on team stats
- [ ] **Ensemble Models**: Combine multiple approaches for higher accuracy

### Success Metrics
- ✅ Betting edge model achieves >55% win rate on backtested data
- ✅ Opponent adjustments improve prop prediction accuracy by >5%
- ✅ Pace normalization reduces projection error by >10%
- ✅ API handles 1000+ requests/min with <200ms latency
- ✅ Frontend toggle works seamlessly across all markets

### Deliverables
- ✅ Betting edge detection system operational
- ✅ Opponent adjustment factors integrated into projections
- ✅ Pace normalization applied to all prop predictions
- ✅ Multi-market API endpoints live
- ✅ ML models deployed and monitored

---

## 🛠️ Technical Infrastructure

### Database Enhancements
```sql
-- Phase 2 additions
CREATE TABLE game_odds (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  spread_home NUMERIC(5,1),
  spread_away NUMERIC(5,1),
  spread_line NUMERIC(5,1),
  total_line NUMERIC(5,1),
  moneyline_home INTEGER,
  moneyline_away INTEGER,
  odds_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_odds_game_id ON game_odds(game_id);
CREATE INDEX idx_games_date ON games(game_date);

-- Phase 3 additions
CREATE TABLE betting_edges (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  market_type TEXT, -- 'spread', 'total', 'moneyline', 'prop'
  recommended_bet TEXT,
  expected_value NUMERIC(5,2),
  confidence INTEGER,
  factors JSONB,
  actual_outcome TEXT,
  result_profit NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE opponent_ratings (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  season TEXT,
  position TEXT, -- 'QB', 'RB', 'WR', etc.
  rating NUMERIC(5,2), -- defensive strength vs position
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_pace_metrics (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  season TEXT,
  pace NUMERIC(5,2), -- possessions per game
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Performance Indexes
```sql
-- Critical for query speed
CREATE INDEX idx_player_game_logs_player_date ON player_game_logs(player_id, game_date DESC);
CREATE INDEX idx_player_game_logs_prop_type ON player_game_logs(prop_type);
CREATE INDEX idx_player_game_logs_hit ON player_game_logs(hit) WHERE hit IS NOT NULL;
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
```

### Caching Strategy
```typescript
// Redis cache for frequently accessed data
const cacheKeys = {
  playerRecentGames: (playerId: string) => `player:${playerId}:recent:10`,
  teamStats: (teamId: string, season: string) => `team:${teamId}:stats:${season}`,
  bettingEdges: (date: string) => `edges:${date}`,
  leaguePace: (league: string, season: string) => `pace:${league}:${season}`
};

// TTL: 15 minutes for live data, 1 hour for historical
```

---

## 📊 Monitoring & Alerts

### Phase 1 Monitors
- Daily data quality validation (>95% threshold)
- Duplicate team creation alerts
- Logo URL 404 detection
- Ingestion failure notifications

### Phase 2 Monitors
- Score ingestion completion rate
- Spread/total line availability
- Cross-team score mismatches
- Schedule completeness gaps

### Phase 3 Monitors
- Betting edge model accuracy drift
- API response time SLA (<200ms P95)
- ML model prediction quality
- Revenue per edge opportunity

---

## 🎯 Key Performance Indicators (KPIs)

### Data Quality
- **Current**: 95/100 (5 PASS, 1 WARNING)
- **Phase 1 Target**: >95/100 sustained for 2 weeks
- **Phase 2 Target**: 98/100 (all 6 tests PASS)
- **Phase 3 Target**: 99/100 (add ML accuracy test)

### Coverage
- **Current**: 3,163 games across 5 leagues
- **Phase 1 Target**: Maintain coverage, no regressions
- **Phase 2 Target**: 100% of scheduled games ingested
- **Phase 3 Target**: Real-time ingestion <5min delay

### Business Metrics
- **Phase 1**: User engagement with player props
- **Phase 2**: Adoption of spread/total features
- **Phase 3**: Betting edge win rate >55%, ROI >5%

---

## 🚀 Getting Started with Phase 1

### Immediate Actions (This Week)

1. **Set up daily validation**:
   ```bash
   # Create logs directory
   mkdir -p logs
   
   # Add to crontab
   crontab -e
   # Add: 0 6 * * * cd /path/to/statpedia && npx tsx scripts/validate-data-quality.ts >> logs/audit.log 2>&1
   ```

2. **Run manual validation**:
   ```bash
   npx tsx scripts/validate-data-quality.ts
   ```

3. **Test frontend integration**:
   - Visit `/players` page
   - Verify all team logos load
   - Check player prop streaks display correctly

4. **Monitor for issues**:
   ```bash
   # Check validation logs
   tail -f logs/audit.log
   
   # Run audit manually
   npx tsx scripts/audit-data-pipeline.ts
   ```

### Maintenance Schedule

| Frequency | Task | Script |
|-----------|------|--------|
| Daily | Data quality validation | `validate-data-quality.ts` |
| Weekly | Full pipeline audit | `audit-data-pipeline.ts` |
| Monthly | Performance review | Custom analytics |
| Quarterly | Backfill check | `verify-game-dates.ts` |

---

## 📚 Resources

### Scripts Inventory
1. ✅ `verify-game-dates.ts` - Date distribution analysis
2. ✅ `fix-missing-team-logos.ts` - Logo URL generation
3. ✅ `merge-duplicate-teams.ts` - Team consolidation
4. ✅ `audit-data-pipeline.ts` - Comprehensive audit
5. ✅ `check-team-abbrev-schema.ts` - Schema inspection
6. ✅ `check-utah-teams.ts` - Team conflict investigation
7. ✅ `validate-data-quality.ts` - 6-test validation suite

### Documentation
- `DATA_AUDIT_REPORT.md` - Initial audit findings
- `DATA_FIXES_EXECUTION_REPORT.md` - Fixes completed
- `ROADMAP.md` - This document

### APIs in Use
- ESPN API (game logs, schedules, scores)
- SportsGameOdds API (odds, lines)

---

## 🎉 Success Milestones

- ✅ **Nov 12, 2025**: Phase 1 complete - 95/100 data quality achieved
- 🎯 **Week 2**: Phase 1 validated - 2 weeks sustained quality
- 🎯 **Week 6**: Phase 2 complete - Scores & spreads ingested
- 🎯 **Week 12**: Phase 3 complete - Full betting edge platform live

---

**Remember**: Each phase builds on the previous. Don't rush to Phase 2 until Phase 1 is rock solid. Quality over speed! 🚀
