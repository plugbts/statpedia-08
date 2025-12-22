#!/bin/bash
# Setup Icura ML artifact environment variable
# Usage: ./scripts/icura/setup-ml-artifact.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTIFACT_PATH="$PROJECT_ROOT/icura_early_goal_logreg.json"
ENV_FILE="$PROJECT_ROOT/.env.local"

echo "🔧 Setting up Icura ML Artifact..."

# Check if artifact exists
if [ ! -f "$ARTIFACT_PATH" ]; then
  echo "⚠️  ML artifact not found at: $ARTIFACT_PATH"
  echo "   Train it first with:"
  echo "   python3 scripts/icura/train-early-goal-logreg.py --out icura_early_goal_logreg.json"
  exit 1
fi

echo "✅ Found artifact: $ARTIFACT_PATH"

# Add to .env.local
if [ -f "$ENV_FILE" ]; then
  # Remove existing ICURA_EARLY_GOAL_ML_ARTIFACT line if present
  sed -i.bak '/^ICURA_EARLY_GOAL_ML_ARTIFACT=/d' "$ENV_FILE"
  # Add new line
  echo "ICURA_EARLY_GOAL_ML_ARTIFACT=$ARTIFACT_PATH" >> "$ENV_FILE"
  echo "✅ Added to .env.local"
else
  echo "ICURA_EARLY_GOAL_ML_ARTIFACT=$ARTIFACT_PATH" > "$ENV_FILE"
  echo "✅ Created .env.local with ICURA_EARLY_GOAL_ML_ARTIFACT"
fi

echo ""
echo "📋 Current value:"
grep ICURA_EARLY_GOAL_ML_ARTIFACT "$ENV_FILE" || echo "  (not found)"
echo ""
echo "✅ Setup complete! Restart your dev server to load the artifact."

