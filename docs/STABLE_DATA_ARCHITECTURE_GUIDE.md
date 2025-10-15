# Stable Data Architecture Implementation Guide

## 🎯 Overview

This implementation solves the "fixing the same things over and over" problem by creating stable boundaries between ingestion, normalization, and presentation layers. The architecture ensures that player names, team logos, and odds are always resolved from canonical mapping tables.

## 🏗️ Architecture Components

### 1. Canonical Mapping Tables
- **`players`**: Single source of truth for player information
- **`teams`**: Canonical team registry with logos and aliases
- **`sportsbooks`**: Centralized sportsbook registry
- **`games`**: Game information with proper team relationships

### 2. Normalization Layer
- **`player_props_normalized` view**: Joins all canonical tables
- **Resolution functions**: `resolve_player()`, `resolve_team()`, `resolve_sportsbook()`
- **Guaranteed data quality**: All display data is always resolved

### 3. Test Harness
- **Golden dataset tests**: Known-good props for regression testing
- **Automated test runner**: Verifies data integrity
- **Health monitoring**: Real-time ingestion status

### 4. Frontend Integration
- **`HasuraPlayerPropsNormalizedService`**: Stable data access
- **Updated components**: Use normalized data instead of raw props
- **Monitoring dashboard**: Track ingestion health

## 🚀 Quick Start

### Step 1: Run Database Migrations

```bash
# Make sure environment variables are set
export HASURA_ADMIN_SECRET="your-admin-secret"
export NEON_DATABASE_URL="your-database-url"

# Run the migration script
./scripts/migrate-stable-architecture.sh
```

### Step 2: Update Data Ingestion

Replace direct database inserts with the bulk upsert function:

```typescript
// OLD: Direct insert
await supabase.from('player_props').insert(rawProps);

// NEW: Use canonical mapping
await hasuraPlayerPropsNormalizedService.bulkUpsertPlayerProps(
  normalizedProps,
  'batch_' + Date.now()
);
```

### Step 3: Migrate Frontend Components

Update components to use normalized data:

```typescript
// OLD: Direct database query
const { data } = await supabase.from('player_props').select('*');

// NEW: Use normalized service
const data = await hasuraPlayerPropsNormalizedService.getPlayerProps({
  sport: 'nfl',
  team_abbrev: 'CIN',
  limit: 50
});
```

### Step 4: Set Up Monitoring

Add the monitoring dashboard to your admin panel:

```typescript
import { IngestionMonitoringDashboard } from '@/components/monitoring/ingestion-monitoring-dashboard';

<IngestionMonitoringDashboard 
  refreshInterval={30000}
  showDetails={true}
/>
```

### Step 5: Run Tests

Verify everything works with the test runner:

```typescript
import { GoldenDatasetTestRunner } from '@/components/testing/golden-dataset-test-runner';

<GoldenDatasetTestRunner 
  autoRun={true}
  showDetails={true}
/>
```

## 📊 Key Benefits

1. **Single Source of Truth**: Player names, team logos, odds flow from canonical tables
2. **Stable Boundaries**: Changes to ingestion don't ripple through to presentation
3. **Regression Safety**: Golden dataset tests catch breaking changes immediately
4. **Data Quality**: Guaranteed resolution of all display data
5. **Observability**: Real-time monitoring of ingestion health and success rates

## 🔧 API Reference

### HasuraPlayerPropsNormalizedService

#### `getPlayerProps(filter?: PlayerPropsFilter): Promise<NormalizedPlayerProp[]>`
Get normalized player props with stable data resolution.

```typescript
const props = await hasuraPlayerPropsNormalizedService.getPlayerProps({
  sport: 'nfl',
  team_abbrev: 'CIN',
  limit: 50
});
```

#### `bulkUpsertPlayerProps(propsData: any[], batchId?: string): Promise<UpsertResult>`
Bulk upsert player props using canonical mapping tables.

```typescript
const result = await hasuraPlayerPropsNormalizedService.bulkUpsertPlayerProps(
  normalizedProps,
  'batch_123'
);
```

#### `runGoldenDatasetTests(): Promise<TestResult[]>`
Run golden dataset tests to ensure data integrity.

```typescript
const results = await hasuraPlayerPropsNormalizedService.runGoldenDatasetTests();
```

#### `getIngestionHealth(): Promise<IngestionHealth>`
Check ingestion health status.

```typescript
const health = await hasuraPlayerPropsNormalizedService.getIngestionHealth();
```

### DatabaseMigrationService

#### `runCanonicalMigrations(): Promise<MigrationResult[]>`
Run all canonical mapping table migrations.

```typescript
const results = await databaseMigrationService.runCanonicalMigrations();
```

#### `checkTablesExist(): Promise<{ [tableName: string]: boolean }>`
Check if canonical tables exist.

```typescript
const tablesExist = await databaseMigrationService.checkTablesExist();
```

## 🧪 Testing

### Golden Dataset Tests

The golden dataset contains known-good props that are used for regression testing:

- **Joe Burrow passing yards**: `CIN` vs `BAL`
- **Ja'Marr Chase receiving yards**: `CIN` vs `BAL`
- **Aaron Rodgers passing touchdowns**: `NYJ` vs `BUF`
- **Josh Allen rushing yards**: `BUF` vs `NYJ`
- **Travis Kelce receptions**: `KC` vs `DEN`

### Test Verification

Each test verifies:
1. Player name is resolved (not "Unknown Player")
2. Team logo is available and accessible
3. Odds are numeric and valid
4. Data flows correctly through the normalized view

### Running Tests

```typescript
// Manual test run
const testRunner = <GoldenDatasetTestRunner autoRun={false} />;

// Automatic test run
const testRunner = <GoldenDatasetTestRunner autoRun={true} />;
```

## 📈 Monitoring

### Health Status

The ingestion health monitor provides real-time status:

- **Healthy**: All systems working correctly
- **Warning**: Some issues detected but system functional
- **Error**: Critical issues requiring attention

### Key Metrics

- **Batches Processed**: Number of ingestion batches
- **Success Rate**: Percentage of successful records
- **Error Count**: Number of failed records
- **Last Updated**: Timestamp of last successful ingestion

### Monitoring Dashboard

```typescript
<IngestionMonitoringDashboard 
  refreshInterval={30000}  // Refresh every 30 seconds
  showDetails={true}       // Show detailed metrics
/>
```

## 🔍 Troubleshooting

### Common Issues

#### "Unknown Player" still appearing
- Check if player exists in canonical `players` table
- Verify `external_id` mapping is correct
- Run `resolve_player()` function to test resolution

#### Missing team logos
- Check if team exists in canonical `teams` table
- Verify `logo_url` is populated
- Run `resolve_team()` function to test resolution

#### Test failures
- Run `run_golden_dataset_tests()` to see specific failures
- Check `ingestion_errors` table for detailed error messages
- Verify all canonical tables are populated

#### Ingestion health warnings
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

## 📚 Migration Guide

### From Raw Player Props

1. **Identify data sources**: Find all places using raw `player_props` table
2. **Update queries**: Replace with `player_props_normalized` view
3. **Update components**: Use `HasuraPlayerPropsNormalizedService`
4. **Test thoroughly**: Run golden dataset tests
5. **Monitor health**: Set up monitoring dashboard

### Component Migration Example

```typescript
// BEFORE: Raw data access
const PlayerPropCard = ({ prop }) => {
  return (
    <div>
      <h3>{prop.player_name || 'Unknown Player'}</h3>
      <img src={prop.team_logo || '/default-logo.png'} />
    </div>
  );
};

// AFTER: Normalized data access
const PlayerPropCard = ({ prop }) => {
  return (
    <div>
      <h3>{prop.player_name}</h3> {/* Guaranteed to be resolved */}
      <img src={prop.team_logo} /> {/* Guaranteed to exist */}
    </div>
  );
};
```

## 🎉 Success Criteria

Your stable data architecture is working correctly when:

1. ✅ All golden dataset tests pass
2. ✅ No "Unknown Player" entries in the UI
3. ✅ All team logos display correctly
4. ✅ Ingestion health shows "healthy" status
5. ✅ Success rate is above 95%
6. ✅ Error count is minimal or zero

## 🚀 Next Steps

1. **Expand Golden Dataset**: Add more test cases for different leagues
2. **Add More Leagues**: Extend team mappings to NBA, MLB, NHL
3. **Enhanced Monitoring**: Add alerts for ingestion failures
4. **Performance Optimization**: Add more indexes based on query patterns
5. **Data Validation**: Add constraints to ensure data quality

---

This architecture ensures that you'll never have to "fix the same things over and over" again. Once a player name or team logo is resolved in the canonical tables, it's resolved everywhere. The normalization layer provides a stable interface that the frontend can rely on, and the test harness catches any regressions before they reach production.
