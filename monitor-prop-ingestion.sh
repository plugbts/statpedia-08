#!/bin/bash

echo "📊 Prop Ingestion System Monitor"
echo "================================"

# Check Cloudflare Worker status
echo "🔍 Checking Cloudflare Worker status..."
WORKER_STATUS=$(curl -s "https://statpedia-player-props.statpedia.workers.dev/status" \
  -H "Origin: https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com")

echo "Worker Status: $WORKER_STATUS"

# Check recent ingestion
echo "📈 Checking recent ingestion..."
INGEST_STATUS=$(curl -s "https://statpedia-player-props.statpedia.workers.dev/ingest" \
  -H "Origin: https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com")

echo "Ingest Status: $INGEST_STATUS"

# Check available leagues
echo "🏈 Checking available leagues..."
LEAGUES_STATUS=$(curl -s "https://statpedia-player-props.statpedia.workers.dev/leagues" \
  -H "Origin: https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com")

echo "Leagues: $LEAGUES_STATUS"

# Check seasons
echo "📅 Checking available seasons..."
SEASONS_STATUS=$(curl -s "https://statpedia-player-props.statpedia.workers.dev/seasons" \
  -H "Origin: https://170e7fa8-3f2c-4d31-94b1-17786919492c.lovableproject.com")

echo "Seasons: $SEASONS_STATUS"

echo ""
echo "✅ Monitoring complete!"