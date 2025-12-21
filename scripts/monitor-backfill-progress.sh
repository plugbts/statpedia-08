#!/bin/bash
# Monitor NFL backfill progress in real-time

LOG_FILE="/tmp/nfl-backfill.log"

echo "🔍 Monitoring NFL backfill progress..."
echo "Press Ctrl+C to stop monitoring (backfill will continue running)"
echo ""

# Check if log file exists, if not, create it
touch "$LOG_FILE"

# Tail the log file with timestamps
tail -f "$LOG_FILE" 2>/dev/null || {
  echo "⚠️  Log file not found. Checking if backfill is running..."
  ps aux | grep -E "backfill-nfl-seasons|ingest-official-game-logs" | grep -v grep
  echo ""
  echo "Starting new backfill with visible output..."
  cd /Users/jackie/Desktop/statpedia-08-1
  npm run backfill:nfl:seasons 2>&1 | tee "$LOG_FILE"
}

