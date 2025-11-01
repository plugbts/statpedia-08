#!/bin/bash
# Test API directly without curl hanging

echo "Testing /api/props endpoint..."
timeout 5 curl -s "http://localhost:3001/api/props?sport=nfl&limit=3" | jq -r '.success, .count, .items[0].playerName' 2>/dev/null || echo "Request failed or timed out"

echo -e "\nTesting /api/props-list endpoint..."
timeout 5 curl -s "http://localhost:3001/api/props-list?league=NFL&limit=3" | jq -r '.source, .count, .items[0].full_name' 2>/dev/null || echo "Request failed or timed out"
