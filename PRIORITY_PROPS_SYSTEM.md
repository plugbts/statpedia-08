# Priority Props System

## Overview

StatPedia now implements a **two-tier props system** to ensure users see the most relevant player props while keeping all data accessible.

---

## 📊 System Stats

**Current Database**: 18,958 total props
- **Priority Props**: 8,820 (46.5%)
- **Extended Props**: 10,138 (53.5%)

**By League**:
- **NFL**: 2,894 priority / 6,870 total (42.1%)
- **NHL**: 4,493 priority / 5,562 total (80.8%)
- **NBA**: 1,080 priority / 1,990 total (54.3%)
- **MLB**: 353 priority / 4,458 total (7.9%)

---

## 🎯 Priority Props Definition

Priority props are markets that **90% of users care about**. These are prominently displayed in the main UI.

### NFL Priority Props (18 markets)
- Passing Yards, Passing TDs, Passing Attempts, Passing Completions
- Rushing Yards, Rushing TDs, Rushing Attempts
- Receiving Yards, Receiving TDs, Receptions
- Rush+Rec Yards, Pass+Rush Yards
- Anytime TD, First TD
- Interceptions, Sacks, Tackles
- Fantasy Score

### NBA Priority Props (11 markets)
- Points, Assists, Rebounds
- 3-Pointers Made, Steals, Blocks, Turnovers
- Points+Assists, Points+Rebounds, Assists+Rebounds
- Points+Assists+Rebounds

### MLB Priority Props (13 markets)
- **Batting**: Hits, Home Runs, RBIs, Stolen Bases, Total Bases, Runs, Strikeouts, Walks, Doubles, Triples
- **Pitching**: Pitcher Strikeouts, Earned Runs, Hits Allowed

### NHL Priority Props (6 markets)
- Goals, Assists, Shots on Goal
- Blocked Shots, Saves, Goals Against

---

## 🏗️ Database Schema

```sql
ALTER TABLE props ADD COLUMN priority BOOLEAN DEFAULT false;
ALTER TABLE props ADD COLUMN side TEXT; -- 'over' or 'under'
ALTER TABLE props ADD COLUMN conflict_key TEXT UNIQUE; -- deduplication

CREATE INDEX idx_props_priority ON props(priority) WHERE priority = true;
```

---

## 🔄 Ingestion Logic

The ingestion script (`ingest-props-drizzle.ts`) automatically marks props as priority during insert:

```typescript
const PRIORITY_PROPS = new Set([
  'Passing Yards', 'Passing TDs', 'Rushing Yards', 
  'Points', 'Assists', 'Rebounds', 
  // ... 50+ total markets
]);

function normalizePropType(market: string): string {
  // Normalizes API stat IDs to friendly names
  // e.g., 'passing_yards' → 'Passing Yards'
  // e.g., 'receiving_receptions' → 'Receptions'
}

function isPriorityProp(propType: string): boolean {
  return PRIORITY_PROPS.has(propType);
}

// During insertion:
await db.insert(props).values({
  player_id: playerRowId,
  team_id: teamIdForPlayer,
  game_id: gameId,
  prop_type: propType,
  line: String(line),
  odds: String(oddsStr),
  priority: isPriorityProp(propType), // ✅ Auto-flagged
  side: side, // 'over' or 'under'
  conflict_key: buildConflictKey(...)
});
```

---

## 📈 Prop Type Normalization

Expanded `normalizePropType()` to handle **50+ stat IDs** from SportsGameOdds API:

### Before (Limited):
```typescript
case 'passing_yards': return 'Passing Yards';
case 'rushing_yards': return 'Rushing Yards';
// Only ~10 mappings
```

### After (Comprehensive):
```typescript
// NFL
case 'passing_yards': return 'Passing Yards';
case 'passing_touchdowns':
case 'passing_tds': return 'Passing TDs';
case 'rushing_receiving_yards': return 'Rush+Rec Yards';
case 'defense_combinedtackles': return 'Tackles';

// NBA
case 'three_pointers_made':
case '3pm': return '3-Pointers Made';
case 'points_assists_rebounds': return 'Points+Assists+Rebounds';

// MLB
case 'batting_homeruns': return 'Home Runs';
case 'pitching_strikeouts': return 'Pitcher Strikeouts';

// NHL
case 'shots_on_goal': return 'Shots on Goal';

// Fallback for unknown markets
default: return toTitleCase(market);
```

**Result**: Now captures combo props, alt lines, and exotic markets that were previously dropped.

---

## 🔍 GraphQL Queries

### Filter Priority Props (Main View)
```graphql
query GetPriorityProps($sport: String!) {
  props(
    where: {
      priority: { _eq: true },
      player: {
        team: {
          league: { code: { _eq: $sport } }
        }
      }
    },
    limit: 100,
    order_by: { created_at: desc }
  ) {
    id
    prop_type
    line
    odds
    side
    priority
    player {
      name
      team {
        abbreviation
        league {
          code
        }
      }
    }
  }
}
```

### Get All Props (Advanced View)
```graphql
query GetAllProps($sport: String!) {
  props(
    where: {
      player: {
        team: {
          league: { code: { _eq: $sport } }
        }
      }
    },
    limit: 500,
    order_by: { priority: desc, created_at: desc }
  ) {
    id
    prop_type
    line
    odds
    priority
    # ... same fields
  }
}
```

### Aggregation by Priority
```graphql
query GetPropCounts {
  priority_props: props_aggregate(where: { priority: { _eq: true } }) {
    aggregate { count }
  }
  extended_props: props_aggregate(where: { priority: { _eq: false } }) {
    aggregate { count }
  }
}
```

---

## 🎨 Frontend Implementation

### Recommended UI Flow

1. **Default Tab** (Main View)
   - Query: `props` with `where: { priority: { _eq: true } }`
   - Shows: Passing Yards, Points, Assists, etc.
   - Fast, focused, 90% use case

2. **Advanced Tab** (Power Users)
   - Query: `props` (no priority filter)
   - Shows: All props including exotic markets
   - Sorted by: `priority DESC, created_at DESC` (priority first)

3. **Filter UI**
   - Toggle: "Show Priority Only" (default: ON)
   - When OFF: Display all props with badge for priority ones

### Example React Component

```typescript
const [showPriorityOnly, setShowPriorityOnly] = useState(true);

const query = `
  query GetProps($sport: String!, $priorityOnly: Boolean!) {
    props(
      where: {
        ${priorityOnly ? 'priority: { _eq: true },' : ''}
        player: {
          team: {
            league: { code: { _eq: $sport } }
          }
        }
      },
      limit: 200
    ) {
      # ... fields
    }
  }
`;

// UI
<Toggle 
  checked={showPriorityOnly}
  onChange={setShowPriorityOnly}
  label="Priority Props Only"
/>
```

---

## 🔧 Maintenance Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `add-priority-column.mjs` | Initial DB migration | One-time setup |
| `backfill-priority-flags.mjs` | Update existing props | Run after prop type changes |
| `test-priority-props.mjs` | Validate priority system | Run after ingestion |
| `reload-hasura-metadata.mjs` | Refresh GraphQL schema | Run after DB schema changes |

### Running Maintenance

```bash
# After adding new priority prop types
DATABASE_URL='...' node scripts/backfill-priority-flags.mjs

# After DB schema changes
HASURA_ADMIN_SECRET='...' node scripts/reload-hasura-metadata.mjs

# Validate system
DATABASE_URL='...' node scripts/test-priority-props.mjs
```

---

## 📊 Performance

### Before Priority System
- **Problem**: Frontend loaded 18K+ props for every query
- **Result**: Slow rendering, cluttered UI, hard to find key props

### After Priority System
- **Solution**: Default queries load 8.8K priority props (46% reduction)
- **Result**: Faster queries, cleaner UI, better UX
- **Bonus**: Extended props still accessible via toggle

### Index Performance
```sql
CREATE INDEX idx_props_priority ON props(priority) WHERE priority = true;
```
- Partial index for fast `WHERE priority = true` queries
- Only indexes ~9K rows instead of 19K
- Significantly faster for main view

---

## 🚀 Future Enhancements

### Short Term
- [ ] Add `priority_rank` column (1 = highest priority)
- [ ] Create "Featured Props" subset (top 3-5 per player)
- [ ] Add UI badges for combo props (Rush+Rec, Pts+Ast+Reb)

### Medium Term
- [ ] Personalized priority based on user behavior
- [ ] Sport-specific priority presets (casual vs power user)
- [ ] A/B test priority thresholds

### Long Term
- [ ] ML-based priority prediction (prop popularity)
- [ ] Dynamic priority based on betting volume
- [ ] Seasonal priority adjustments (playoffs, fantasy playoffs)

---

## 🎯 Key Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Priority props % | 40-60% | 46.5% | ✅ |
| NHL priority % | >75% | 80.8% | ✅ |
| NBA priority % | >50% | 54.3% | ✅ |
| NFL priority % | >35% | 42.1% | ✅ |
| MLB priority % | >10% | 7.9% | ⚠️ Needs more batting mappings |

---

## 📝 Known Issues & TODO

### MLB Prop Normalization
**Issue**: Only 7.9% of MLB props marked as priority (should be >10%)

**Cause**: Many MLB batting stats have inconsistent naming:
- `batting_hits+runs+rbi` (combo stat, not in priority set)
- `batting_singles` (alt line, not priority)
- `batting_basesonballs` (not normalized to "Walks")

**Fix**:
```typescript
// Add to priority set:
'Hits+Runs+RBI', 'Singles', 'Extra Base Hits'

// Add to normalizePropType:
case 'batting_hits+runs+rbi': return 'Hits+Runs+RBI';
case 'batting_singles': return 'Singles';
case 'batting_basesonballs': return 'Walks';
```

### Exotic Markets
Some markets are intentionally NOT priority:
- Longest reception/rush (alt lines)
- First to score (game props, not player stats)
- Fantasy score variations (site-specific)

These are kept as "Extended Props" and accessible via advanced view.

---

## ✅ Summary

The two-tier priority props system is **fully operational**:

✅ Database schema updated with `priority`, `side`, `conflict_key` columns  
✅ 8,820 priority props flagged (46.5% of total)  
✅ 50+ stat IDs normalized across all sports  
✅ Hasura metadata refreshed, GraphQL queries working  
✅ Ingestion script auto-flags new props  
✅ Backfill script for existing data  
✅ Test scripts for validation  

**Ready for frontend integration!**

