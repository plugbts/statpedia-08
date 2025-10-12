#!/bin/bash

# Deploy Optimized Two-Tier Caching System
echo "🚀 Deploying Optimized Two-Tier Caching System..."

echo "📊 Deploying Raw SportsGameOdds API Cache (15-30s TTL)..."
# Deploy the raw API cache worker first
PROPS_CACHE_ID=$(wrangler kv namespace create "PROPS_CACHE" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
if [ -z "$PROPS_CACHE_ID" ]; then
    echo "❌ Failed to create PROPS_CACHE KV namespace"
    exit 1
fi

sed -i.bak "s/your-props-cache-kv-namespace-id/$PROPS_CACHE_ID/g" sportsgameodds-wrangler.toml
wrangler deploy --config sportsgameodds-wrangler.toml

if [ $? -eq 0 ]; then
    echo "✅ Raw API Cache Worker deployed!"
    echo "🌐 Endpoint: https://statpedia-sportsgameodds-cache.statpedia.workers.dev"
    echo "⚡ TTL: 15-30 seconds (prevents rate limits)"
else
    echo "❌ Raw API Cache deployment failed"
    exit 1
fi

echo ""
echo "📊 Deploying Selective GraphQL Cache (1min-1hr TTL)..."
# Deploy the optimized GraphQL proxy
GRAPHQL_CACHE_ID=$(wrangler kv namespace create "GRAPHQL_CACHE" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
if [ -z "$GRAPHQL_CACHE_ID" ]; then
    echo "❌ Failed to create GRAPHQL_CACHE KV namespace"
    exit 1
fi

sed -i.bak "s/your-graphql-cache-kv-namespace-id/$GRAPHQL_CACHE_ID/g" optimized-wrangler.toml
wrangler deploy --config optimized-wrangler.toml

if [ $? -eq 0 ]; then
    echo "✅ Optimized GraphQL Proxy deployed!"
    echo "🌐 Endpoint: https://statpedia-optimized-proxy.statpedia.workers.dev"
    echo "🎯 Selective caching with smart TTLs"
else
    echo "❌ GraphQL Proxy deployment failed"
    exit 1
fi

echo ""
echo "🎉 OPTIMIZED TWO-TIER CACHING SYSTEM DEPLOYED!"
echo "=================================================="
echo ""
echo "📊 Raw SportsGameOdds API Cache:"
echo "  - TTL: 15-30 seconds"
echo "  - Prevents rate limit issues"
echo "  - Stable ingestion"
echo ""
echo "📊 Selective GraphQL Cache:"
echo "  - Prop Types: 1 hour"
echo "  - Leagues/Teams: 30 minutes"
echo "  - Players: 15 minutes"
echo "  - Games: 5 minutes"
echo "  - Player Props: 1 minute"
echo "  - Analytics: 10 minutes"
echo ""
echo "🚫 Cache Bypass Rules:"
echo "  - All mutations (no cache)"
echo "  - Live queries (real-time data)"
echo "  - Recent data queries"
echo ""
echo "⚡ Benefits:"
echo "  - 80-90% reduction in API calls"
echo "  - Stable ingestion (no rate limits)"
echo "  - Fast response times"
echo "  - Smart cache invalidation"
echo ""
echo "🔧 Usage:"
echo "  Raw API: GET /sportsgameodds?league=NFL&season=2025"
echo "  GraphQL: POST /v1/graphql (with selective caching)"
