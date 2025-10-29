# UNK Value Prevention System

This document describes the comprehensive system implemented to prevent `UNK` and `-` values from entering the database.

## Overview

The problem: `UNK` and `-` values were appearing in player names, team abbreviations, and other critical fields, indicating incomplete data mappings or failed lookups during ingestion.

The solution: A multi-layered defense system that prevents bad data at multiple levels:

1. **Database-level constraints** - Block bad data at insertion time
2. **Pre-ingestion validation** - Validate data before it reaches the database
3. **Backfill/cleanup scripts** - Clean existing bad data
4. **Continuous monitoring** - Detect and block deployments with bad data

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Ingestion Flow                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  1. Pre-Ingestion Validation         │
        │     scripts/validate-ingestion-data  │
        │     - Check for UNK/dash values      │
        │     - Verify team/player mappings    │
        │     - Fail early with clear errors   │
        └──────────────────────────────────────┘
                              │
                              ▼ (only if valid)
        ┌──────────────────────────────────────┐
        │  2. Database CHECK Constraints       │
        │     - Reject UNK, dash, empty values │
        │     - Enforce at table level         │
        │     - Cannot be bypassed             │
        └──────────────────────────────────────┘
                              │
                              ▼ (if passes)
        ┌──────────────────────────────────────┐
        │  3. Data Successfully Inserted       │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  4. Continuous Monitoring            │
        │     scripts/monitor-unk-blocking     │
        │     - Scans for any UNK values       │
        │     - Blocks CI/CD if found          │
        │     - Exits with error code          │
        └──────────────────────────────────────┘
```

## Components

### 1. Database Migration (0005_prevent_unk_values.sql)

**Location:** `db/migrations/0005_prevent_unk_values.sql`

Adds CHECK constraints to prevent UNK values at the database level:

- **proplines table**: Constrains team, opponent, player_name, home_team, away_team
- **players table**: Constrains full_name, first_name, last_name, external_id
- **teams table**: Constrains name, abbreviation, external_id
- **player_props table**: Constrains external_id, sportsbook (where applicable)

Also provides utility functions:
- `check_for_unk_values()`: Returns any UNK violations found
- `validate_propline_data()`: Validates data before insertion

**Usage:**
```bash
# Apply migration
psql $DATABASE_URL -f db/migrations/0005_prevent_unk_values.sql

# Check for violations
psql $DATABASE_URL -c "SELECT * FROM check_for_unk_values();"
```

### 2. Pre-Ingestion Validation Script

**Location:** `scripts/validate-ingestion-data.ts`

Validates data before ingestion to catch issues early.

**Features:**
- Checks required fields for UNK/dash/empty values
- Verifies team abbreviations exist in database
- Verifies player names exist (warns if not found)
- Checks consistency between team/opponent and home/away
- Provides detailed error and warning reports

**Usage:**
```bash
# Test with sample data
npm run validate:ingestion

# Validate a data file
tsx scripts/validate-ingestion-data.ts data.json

# Programmatic usage
import { validateIngestionData } from './scripts/validate-ingestion-data';
const results = await validateIngestionData(data);
```

**Integration Example:**
```typescript
import { validateIngestionData, printValidationResults } from './scripts/validate-ingestion-data';

async function ingestData(data: ProplineData[]) {
  // Validate before ingesting
  const results = await validateIngestionData(data);
  const passed = printValidationResults(results);
  
  if (!passed) {
    throw new Error('Data validation failed - fix errors before ingesting');
  }
  
  // Proceed with ingestion
  await insertData(results.results.filter(r => r.validation.isValid).map(r => r.data));
}
```

### 3. Backfill/Cleanup Script

**Location:** `scripts/backfill-clean-unk-values.ts`

Cleans existing UNK values from the database.

**Features:**
- Scans all tables for UNK/dash/empty values
- Reports what was found
- Can delete unresolvable records (with confirmation)
- Provides detailed statistics

**Usage:**
```bash
# Dry run - see what would be cleaned
npm run backfill:clean-unk:dry-run

# Report mode - find and report UNK values
npm run backfill:clean-unk

# Delete mode - remove records with UNK values (DESTRUCTIVE!)
npm run backfill:clean-unk:delete
```

**Before running delete mode:**
1. Backup your database
2. Review the dry-run output
3. Consider manual resolution of important records
4. Run with confirmation

### 4. Continuous Monitoring Script

**Location:** `scripts/monitor-unk-blocking.ts`

Monitors for UNK values and blocks deployment if found.

**Features:**
- Scans all critical tables for UNK values
- Provides clear error output
- Exits with error code 1 if violations found
- Exits with error code 0 if clean
- Integrated into CI/CD pipeline

**Usage:**
```bash
# Manual check
npm run monitor:unk

# In CI/CD (automatic)
npx tsx scripts/monitor-unk-blocking.ts
```

**Exit Codes:**
- `0` - No UNK values found (success)
- `1` - UNK values found (failure)
- `2` - Script error

### 5. CI/CD Integration

**Location:** `.github/workflows/ci.yml`

The monitoring script is integrated into the CI/CD pipeline:

```yaml
- name: Monitor for UNK values
  run: npx tsx scripts/monitor-unk-blocking.ts
  continue-on-error: false
```

This step will **fail the build** if any UNK values are detected, preventing bad data from being deployed.

## Usage Workflow

### For Development

1. **Before ingesting new data:**
   ```bash
   # Validate your data
   tsx scripts/validate-ingestion-data.ts my-data.json
   ```

2. **If validation fails:**
   - Fix the data source
   - Update team/player mappings
   - Do not bypass validation

3. **After fixing issues:**
   - Re-run validation
   - Proceed with ingestion only if validation passes

### For Deployment

1. **Before deploying:**
   ```bash
   # Check for UNK values
   npm run monitor:unk
   ```

2. **If UNK values found:**
   ```bash
   # Clean up UNK values
   npm run backfill:clean-unk:delete
   
   # Verify cleanup worked
   npm run monitor:unk
   ```

3. **CI/CD will automatically:**
   - Run the monitoring script
   - Block deployment if UNK values exist
   - Fail the build with clear error messages

### For Maintenance

**Weekly/Monthly:**
```bash
# Check for any UNK values
npm run monitor:unk

# Review database health
psql $DATABASE_URL -c "SELECT * FROM check_for_unk_values();"
```

## Database Functions

Two PostgreSQL functions are available:

### check_for_unk_values()

Returns any UNK violations found in the database:

```sql
SELECT * FROM check_for_unk_values();
```

Output:
```
table_name | column_name | unk_count | sample_ids
-----------+-------------+-----------+------------
proplines  | team        | 5         | {uuid1, uuid2, ...}
```

### validate_propline_data()

Validates data before insertion:

```sql
SELECT validate_propline_data(
  'Patrick Mahomes',  -- player_name
  'KC',               -- team
  'BUF',              -- opponent
  'KC',               -- home_team
  'BUF'               -- away_team
);
```

Raises an exception if any field contains UNK/dash/empty values.

## Prevented Scenarios

This system prevents:

1. ❌ Inserting records with `team = 'UNK'`
2. ❌ Inserting records with `opponent = '-'`
3. ❌ Inserting records with `player_name = ''`
4. ❌ Deploying code when UNK values exist
5. ❌ Silent failures in data mapping
6. ❌ Bad data propagating to production

## Best Practices

1. **Always validate before ingesting**
   - Use `validate-ingestion-data.ts` on all incoming data
   - Do not skip validation for "urgent" deployments

2. **Fix the source, not the symptoms**
   - If UNK values appear, trace back to the source
   - Update mappings rather than patching individual records
   - Document why mappings were missing

3. **Monitor regularly**
   - Run `monitor:unk` before each deployment
   - Review CI/CD logs for validation failures
   - Set up alerts for UNK detection

4. **Handle foreign data carefully**
   - New leagues/teams require mapping updates
   - Player name variations need normalization
   - Test with sample data first

5. **Use the backfill script responsibly**
   - Always dry-run first
   - Review what will be deleted
   - Consider manual resolution for important records

## Troubleshooting

### "Validation failed - team abbreviation not found"

**Cause:** Team mapping is missing from database

**Solution:**
1. Add team to `teams` table
2. Add mapping to `team_abbrev_map` table
3. Re-run validation

### "Database constraint violation: team cannot be UNK"

**Cause:** Attempting to insert UNK value

**Solution:**
1. Check why team resolution failed
2. Add missing team mapping
3. Update ingestion code to use mappings
4. Re-validate data before ingesting

### "CI/CD build failed - UNK values detected"

**Cause:** Existing UNK values in database

**Solution:**
1. Run `npm run backfill:clean-unk` to identify records
2. Fix or delete problematic records
3. Verify with `npm run monitor:unk`
4. Re-run CI/CD

### "Player not found in database"

**Cause:** New player not yet in system

**Note:** This is a WARNING, not an error
- Validation will still pass
- Player may be created during ingestion
- Monitor for UNK values after ingestion

## Migration Guide

To apply these changes to an existing system:

1. **Apply database migration:**
   ```bash
   psql $DATABASE_URL -f db/migrations/0005_prevent_unk_values.sql
   ```

2. **Clean existing data:**
   ```bash
   npm run backfill:clean-unk:dry-run
   npm run backfill:clean-unk:delete  # After reviewing
   ```

3. **Update ingestion scripts:**
   - Import validation functions
   - Add validation before inserts
   - Handle validation errors

4. **Test the system:**
   ```bash
   npm run validate:ingestion
   npm run monitor:unk
   ```

5. **Monitor CI/CD:**
   - Ensure monitoring step runs
   - Verify it blocks bad deployments
   - Check logs for validation output

## Summary

This system implements defense in depth:

- **Prevention**: CHECK constraints block bad data at insertion
- **Detection**: Validation catches issues before they reach the database
- **Cleanup**: Backfill script removes existing violations
- **Monitoring**: Continuous checks prevent bad deployments

**Result:** UNK values can no longer enter or persist in the database.

## Support

For issues or questions:
1. Check this guide first
2. Review error messages from validation/monitoring scripts
3. Examine database constraint violations
4. Check CI/CD logs for validation failures

Remember: **UNK values indicate a mapping problem - fix the source, not the symptom.**
