#!/bin/bash
# Setup script for G1F10 advanced features
# This script runs the migration and populates all new features

set -e

# Check for database connection (prioritize Neon)
DB_URL="${NEON_DATABASE_URL:-${DATABASE_URL:-${SUPABASE_DATABASE_URL}}}"

# Try loading from .env file if not set
if [ -z "$DB_URL" ] && [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^(NEON_DATABASE_URL|DATABASE_URL|SUPABASE_DATABASE_URL)=' | xargs)
  DB_URL="${NEON_DATABASE_URL:-${DATABASE_URL:-${SUPABASE_DATABASE_URL}}}"
fi

if [ -z "$DB_URL" ]; then
  echo "❌ Error: No database connection string found"
  echo ""
  echo "Please set NEON_DATABASE_URL (prioritized) or one of:"
  echo "  - NEON_DATABASE_URL (preferred for Neon)"
  echo "  - DATABASE_URL"
  echo "  - SUPABASE_DATABASE_URL"
  echo ""
  echo "Example for Neon:"
  echo "  export NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname'"
  echo "  ./scripts/icura/setup-g1f10-features.sh"
  echo ""
  echo "Or add to .env file:"
  echo "  NEON_DATABASE_URL='postgresql://...'"
  exit 1
fi

# Detect if using Neon
if echo "$DB_URL" | grep -q "neon.tech\|neon\.tech"; then
  echo "✅ Using Neon database"
else
  echo "⚠️  Not using Neon database (using: ${DB_URL%%@*})"
fi

SEASON="${1:-2024-2025}"
OUTPUT_FILE="${2:-icura_early_goal_logreg_g1f10.json}"

echo "🚀 G1F10 Advanced Features Setup"
echo "=================================="
echo "Season: $SEASON"
echo "Output: $OUTPUT_FILE"
echo ""

# Step 1: Run migration
echo "📦 Step 1: Running database migration..."
psql "$DB_URL" -f db/migrations/0019_add_g1f10_advanced_features.sql
echo "✅ Migration complete"
echo ""

# Step 2: Populate goalie features
echo "🥅 Step 2: Populating goalie features..."
tsx scripts/icura/populate-goalie-features.ts --season "$SEASON"
echo "✅ Goalie features populated"
echo ""

# Step 3: Populate referee features
echo "👨‍⚖️  Step 3: Populating referee features..."
tsx scripts/icura/populate-referee-features.ts --season "$SEASON"
echo "✅ Referee features populated"
echo ""

# Step 4: Populate shift features
echo "🔄 Step 4: Populating shift-level features..."
tsx scripts/icura/populate-shift-features.ts --season "$SEASON"
echo "✅ Shift features populated"
echo ""

# Step 5: Retrain model
echo "🤖 Step 5: Retraining G1F10 model with new features..."
python3 scripts/icura/train-early-goal-logreg.py \
  --db "$DB_URL" \
  --out "$OUTPUT_FILE" \
  --train-start "2023-10-01" \
  --train-end "2024-07-01"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Next steps:"
echo "  1. Review model performance in $OUTPUT_FILE"
echo "  2. Set ICURA_EARLY_GOAL_ML_ARTIFACT=$OUTPUT_FILE"
echo "  3. Test predictions with new features"
echo ""

