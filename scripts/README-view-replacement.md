# View Replacement Scripts

This directory contains scripts for replacing and validating the `v_props_list` database view.

## Overview
The `v_props_list` view had issues with missing team/opponent data (showing UNK/?) and missing analytics fields (showing -). This has been fixed with a hardened version that includes multiple fallback mechanisms.

## Files

### replace-view-v-props-list.sql
The corrected view definition with:
- Fixed syntax (no stray colons)
- Team/opponent abbreviation resolution with fallbacks
- ESPN logo URL generation for NFL/NBA/MLB/NHL
- Analytics fields with fallbacks from multiple sources
- Postgres 15 compatible syntax

### apply-view-replacement.sh
Bash script to apply the view replacement to the database.

**Usage:**
```bash
./scripts/apply-view-replacement.sh
```

**Requirements:**
- `DATABASE_URL` or `NEON_DATABASE_URL` environment variable set
- `psql` command available

### validate-view-replacement.sql
Validation queries to verify the view works correctly after application.

**Usage:**
```bash
psql "$DATABASE_URL" -f scripts/validate-view-replacement.sql
```

**Checks:**
- Total record count
- Missing teams/opponents
- Analytics population rates
- Logo generation for major leagues
- Data quality issues
- Sample output validation

## Quick Start

1. **Apply the view:**
   ```bash
   ./scripts/apply-view-replacement.sh
   ```

2. **Validate:**
   ```bash
   psql "$DATABASE_URL" -f scripts/validate-view-replacement.sql
   ```

3. **If needed, backfill opponents:**
   ```bash
   npm run db:backfill:opponents
   ```

## Documentation
See [docs/v-props-list-view-replacement.md](../docs/v-props-list-view-replacement.md) for detailed documentation.

## Expected Results
After applying this view:
- ✅ No UNK/? values for teams
- ✅ Team/opponent populated with fallbacks
- ✅ Logos generated for NFL/NBA/MLB/NHL
- ✅ Analytics fields populated where data exists
- ✅ current_streak defaults to 0

## Troubleshooting

### View creation fails
- Check that all referenced tables exist
- Verify column names match the schema
- Ensure Postgres version is 15+

### Missing team/opponent data
- Run backfill: `npm run db:backfill:opponents`
- Check player_game_logs table has data
- Verify teams table has abbreviations

### Missing analytics
- Check player_enriched_stats table has data
- Check player_analytics table exists and has data
- Run enrichment: `npx tsx scripts/run-analytics-diagnostics.ts`
