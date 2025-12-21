#!/bin/bash
# Run NFL backfill with visible progress output

cd /Users/jackie/Desktop/statpedia-08-1

echo "🏈 Starting NFL backfill with LIVE PROGRESS..."
echo "=============================================="
echo ""

# Run the backfill and show all output in real-time
npm run backfill:nfl:seasons

