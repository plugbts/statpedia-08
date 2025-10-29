#!/bin/bash
# Apply the v_props_list view replacement SQL
# This script applies the corrected view definition to the database

set -e

echo "🔄 Applying v_props_list view replacement..."

# Check if DATABASE_URL or NEON_DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$NEON_DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL or NEON_DATABASE_URL environment variable is not set"
  exit 1
fi

# Use NEON_DATABASE_URL if available, otherwise fall back to DATABASE_URL
DB_URL="${NEON_DATABASE_URL:-$DATABASE_URL}"

# Apply the SQL file
echo "📝 Executing SQL from scripts/replace-view-v-props-list.sql..."
psql "$DB_URL" -f scripts/replace-view-v-props-list.sql

if [ $? -eq 0 ]; then
  echo "✅ View v_props_list successfully replaced!"
  echo ""
  echo "Next steps:"
  echo "1. Verify view with: SELECT * FROM v_props_list LIMIT 10;"
  echo "2. Check for missing opponents: SELECT COUNT(*) FROM v_props_list WHERE opponent IS NULL;"
  echo "3. If needed, backfill opponents: npm run db:backfill:opponents"
  echo "4. Spot-check analytics: psql \$DATABASE_URL -f verify-analytics-spot-check.sql"
else
  echo "❌ Error applying view replacement"
  exit 1
fi
