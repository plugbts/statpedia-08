#!/bin/bash
# Download MoneyPuck shot data CSV from moneypuck.com/data.htm
# Usage: ./scripts/icura/download-moneypuck.sh [season]
# Example: ./scripts/icura/download-moneypuck.sh 2024

SEASON=${1:-2024}
YEAR_START=$SEASON
YEAR_END=$((SEASON + 1))

echo "📥 Downloading MoneyPuck shots data for ${YEAR_START}-${YEAR_END} season..."

# MoneyPuck typically hosts CSVs at:
# https://moneypuck.com/moneypuck/playerData/season/${SEASON}/regular/shots.csv
# Or: https://moneypuck.com/data/moneypuck_shots_${SEASON}.csv

URLS=(
  "https://moneypuck.com/moneypuck/playerData/season/${SEASON}/regular/shots.csv"
  "https://moneypuck.com/data/moneypuck_shots_${SEASON}.csv"
  "https://moneypuck.com/moneypuck_shots_${SEASON}.csv"
)

OUTPUT_FILE="moneypuck_shots_${SEASON}.csv"

for URL in "${URLS[@]}"; do
  echo "Trying: $URL"
  if curl -f -L -o "$OUTPUT_FILE" "$URL" 2>/dev/null; then
    echo "✅ Downloaded to: $OUTPUT_FILE"
    echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo ""
    echo "To ingest into database, run:"
    echo "  tsx scripts/icura/ingest-moneypuck-shots.ts --file $OUTPUT_FILE --season ${YEAR_START}-${YEAR_END}"
    exit 0
  fi
done

echo "❌ Failed to download from any URL"
echo ""
echo "Please manually download from:"
echo "  https://moneypuck.com/data.htm"
echo ""
echo "Then run:"
echo "  tsx scripts/icura/ingest-moneypuck-shots.ts --file /path/to/downloaded.csv --season ${YEAR_START}-${YEAR_END}"
exit 1

