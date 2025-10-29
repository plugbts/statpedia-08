# UNK Value Prevention - Implementation Summary

## Problem Statement

The application was experiencing persistent issues with `UNK` and `-` values appearing in critical fields like player names, team abbreviations, and opponent information. This indicated a systematic problem in the data ingestion pipeline where incomplete data mappings were being silently accepted instead of being rejected.

## Root Causes Identified

1. **No validation at ingestion time** - Data was ingested without checking for invalid values
2. **No database constraints** - The database accepted `UNK` and `-` values without restriction
3. **Reactive monitoring** - Existing monitoring only logged issues after they occurred, but didn't prevent them
4. **Silent failures** - When ID mappings failed, the system defaulted to `UNK` instead of failing loudly

## Solution Architecture

We implemented a **multi-layered defense system** that prevents bad data at multiple levels:

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA INGESTION PIPELINE                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  1. Pre-Validation  │ ◄── LAYER 1: PREVENT
                    │  (Validation Script)│
                    └─────────────────────┘
                              │
                              ▼ (only if valid)
                    ┌─────────────────────┐
                    │  2. Database CHECK  │ ◄── LAYER 2: ENFORCE
                    │    Constraints      │
                    └─────────────────────┘
                              │
                              ▼ (if passes)
                    ┌─────────────────────┐
                    │  3. Data Inserted   │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  4. Continuous      │ ◄── LAYER 3: DETECT
                    │     Monitoring      │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  5. CI/CD Blocking  │ ◄── LAYER 4: BLOCK
                    └─────────────────────┘
```

## Implementation Details

### 1. Database Constraints (Layer 2)

**File:** `db/migrations/0005_prevent_unk_values.sql`

Added CHECK constraints to ensure data integrity at the database level:

```sql
-- Example constraint for proplines table
ALTER TABLE public.proplines 
ADD CONSTRAINT proplines_team_not_unk 
CHECK (team IS NOT NULL AND team != 'UNK' AND team != '-' AND trim(team) != '');
```

**Tables Protected:**
- `proplines`: team, opponent, player_name, home_team, away_team
- `players`: full_name, first_name, last_name, external_id
- `teams`: name, abbreviation, external_id
- `player_props`: external_id, sportsbook

**Key Features:**
- Cannot be bypassed (enforced by PostgreSQL)
- Fail immediately on insert attempt
- Provide clear error messages
- Include utility functions for validation

**Helper Functions:**
```sql
-- Check for existing UNK values
SELECT * FROM check_for_unk_values();

-- Validate before insertion
SELECT validate_propline_data('Patrick Mahomes', 'KC', 'BUF', 'KC', 'BUF');
```

### 2. Pre-Ingestion Validation (Layer 1)

**File:** `scripts/validate-ingestion-data.ts`

Validates data before it reaches the database:

```typescript
import { validateIngestionData } from './scripts/validate-ingestion-data';

const results = await validateIngestionData(data);
if (!results.isValid) {
  throw new Error('Validation failed - fix errors before ingesting');
}
```

**Validation Checks:**
- ✅ No UNK, dash, or empty values in required fields
- ✅ Team abbreviations exist in database
- ✅ Player names are valid (warning if not found)
- ✅ Line values are numeric
- ✅ Team/opponent consistency with home/away

**Output:**
```
📊 Validation Results
Total records: 3
Valid records: 1 (33.3%)
Invalid records: 2 (66.7%)

❌ Errors Found:
  INVALID_VALUE (4 errors):
    1. Required field 'team' has invalid value: 'UNK'
    2. Required field 'player_name' has invalid value: 'UNK'
```

### 3. Backfill/Cleanup Script (Layer 3 - Cleanup)

**File:** `scripts/backfill-clean-unk-values.ts`

Cleans existing UNK values from the database:

```bash
# Dry run - see what would be cleaned
npm run backfill:clean-unk:dry-run

# Report mode - find and report UNK values
npm run backfill:clean-unk

# Delete mode - remove records with UNK values
npm run backfill:clean-unk:delete
```

**Features:**
- Scans all tables for UNK/dash/empty values
- Provides detailed statistics
- Safe by default (requires explicit flag to delete)
- Shows sample records before deletion

### 4. Continuous Monitoring (Layer 3 - Detection)

**File:** `scripts/monitor-unk-blocking.ts`

Monitors for UNK values and blocks deployment if found:

```bash
npm run monitor:unk
```

**Exit Codes:**
- `0` - No UNK values found (success)
- `1` - UNK values found (failure)
- `2` - Script error

**Integration:**
```yaml
# .github/workflows/ci.yml
- name: Monitor for UNK values
  run: npx tsx scripts/monitor-unk-blocking.ts
  continue-on-error: false  # Fails the build if UNK found
```

### 5. CI/CD Integration (Layer 4)

**File:** `.github/workflows/ci.yml`

Added monitoring step to CI/CD pipeline that **blocks deployment** if UNK values are detected.

## NPM Scripts Added

```json
{
  "validate:ingestion": "tsx scripts/validate-ingestion-data.ts --test",
  "backfill:clean-unk": "tsx scripts/backfill-clean-unk-values.ts",
  "backfill:clean-unk:dry-run": "tsx scripts/backfill-clean-unk-values.ts --dry-run",
  "backfill:clean-unk:delete": "tsx scripts/backfill-clean-unk-values.ts --delete-unresolvable",
  "monitor:unk": "tsx scripts/monitor-unk-blocking.ts",
  "db:check-unk": "tsx scripts/monitor-unk-blocking.ts",
  "test:unk-prevention": "tsx scripts/test-unk-prevention.ts"
}
```

## Testing

Created comprehensive test suite to verify the system works:

```bash
npm run test:unk-prevention
```

**Test Results:**
```
✅ All tests passed! (6/6)

💡 The UNK prevention system is working correctly:
   - Valid data passes validation
   - UNK values are detected and rejected
   - Dash values are detected and rejected
   - Empty strings are detected and rejected
   - Missing values are detected and rejected

🔒 Your database is protected from bad data!
```

## Usage Examples

### Before Ingestion

```typescript
import { validateIngestionData, printValidationResults } from './scripts/validate-ingestion-data';

async function ingestPlayerProps(data: ProplineData[]) {
  // Validate first
  const results = await validateIngestionData(data);
  const passed = printValidationResults(results);
  
  if (!passed) {
    throw new Error('Validation failed - aborting ingestion');
  }
  
  // Only ingest valid data
  const validData = results.results
    .filter(r => r.validation.isValid)
    .map(r => r.data);
  
  await insertIntoDatabase(validData);
}
```

### Monitoring in Production

```bash
# Check for UNK values
npm run monitor:unk

# If found, clean them up
npm run backfill:clean-unk:delete

# Verify cleanup worked
npm run monitor:unk
```

### CI/CD Pipeline

The monitoring step automatically runs in CI/CD and will **fail the build** if UNK values exist:

```
❌ Monitoring FAILED - DO NOT DEPLOY

Total records with UNK values: 45

proplines (45 total records):
  team: 23 records
  opponent: 22 records
```

## Benefits Achieved

### 1. Prevention (Proactive)
✅ Invalid data **cannot enter** the database  
✅ Validation **fails early** with clear error messages  
✅ Developers **know immediately** when data is bad

### 2. Detection (Reactive)
✅ Continuous monitoring **catches any issues**  
✅ CI/CD **blocks bad deployments**  
✅ Clear reports **show what needs fixing**

### 3. Cleanup (Recovery)
✅ Existing bad data **can be cleaned**  
✅ Safe dry-run mode **prevents accidents**  
✅ Detailed stats **track progress**

### 4. Documentation
✅ Comprehensive guide **explains everything**  
✅ Usage examples **show how to use**  
✅ Troubleshooting **helps fix issues**

## Migration Path

To apply these changes to an existing system:

1. **Apply database migration:**
   ```bash
   psql $DATABASE_URL -f db/migrations/0005_prevent_unk_values.sql
   ```

2. **Clean existing data:**
   ```bash
   npm run backfill:clean-unk:dry-run  # Review what would be deleted
   npm run backfill:clean-unk:delete   # Delete bad records
   ```

3. **Update ingestion scripts:**
   - Import validation functions
   - Add validation before inserts
   - Handle validation errors

4. **Test the system:**
   ```bash
   npm run test:unk-prevention
   npm run monitor:unk
   ```

5. **Deploy to production:**
   - CI/CD will automatically check for UNK values
   - Build will fail if any are found
   - Fix issues before deploying

## Success Metrics

**Before Implementation:**
- ❌ UNK values could enter database silently
- ❌ No way to prevent bad data at source
- ❌ Monitoring was reactive only
- ❌ Deployments could include bad data

**After Implementation:**
- ✅ UNK values **cannot enter** database
- ✅ Bad data is **blocked at ingestion**
- ✅ Monitoring is **proactive and blocking**
- ✅ Deployments are **guaranteed clean**

## Files Changed

### New Files
1. `db/migrations/0005_prevent_unk_values.sql` - Database constraints
2. `scripts/validate-ingestion-data.ts` - Pre-ingestion validation
3. `scripts/backfill-clean-unk-values.ts` - Cleanup script
4. `scripts/monitor-unk-blocking.ts` - Continuous monitoring
5. `scripts/test-unk-prevention.ts` - Integration tests
6. `UNK_PREVENTION_GUIDE.md` - Complete usage guide
7. `IMPLEMENTATION_SUMMARY.md` - This file

### Modified Files
1. `.github/workflows/ci.yml` - Added monitoring step
2. `package.json` - Added new scripts

## Conclusion

This implementation provides **defense in depth** against UNK values:

- **Layer 1 (Validation)**: Catch bad data before it reaches the database
- **Layer 2 (Constraints)**: Prevent bad data at the database level
- **Layer 3 (Monitoring)**: Detect any issues that slip through
- **Layer 4 (CI/CD)**: Block deployments with bad data

The system is:
- ✅ **Comprehensive** - Multiple layers of protection
- ✅ **Automated** - Runs in CI/CD without manual intervention
- ✅ **Documented** - Clear guides and examples
- ✅ **Tested** - Verified with integration tests
- ✅ **Safe** - Dry-run modes prevent accidents

**Result:** UNK values can no longer enter or persist in the database, and the ingestion pipeline will fail loudly if there are mapping issues instead of silently accepting bad data.
