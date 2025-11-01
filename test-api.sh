#!/bin/bash
# Simple script to test the API without interrupting the server

# Make the request in the background
curl -sS "http://localhost:3001/api/props-list?limit=5" > /tmp/api-test-output.json 2>&1 &
PID=$!

# Wait a bit
sleep 2

# Check if request completed
if kill -0 $PID 2>/dev/null; then
  echo "Request still pending..."
  kill $PID 2>/dev/null
else
  echo "Response:"
  cat /tmp/api-test-output.json | jq '.count, .source, .items[0] | {name: .full_name, team, opponent, l5, l10, season_avg}'
fi
