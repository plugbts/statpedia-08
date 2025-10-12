#!/bin/bash

# Deploy Cloudflare Edge Caching for SportsGameOdds API
echo "🚀 Deploying SportsGameOdds Edge Cache Worker..."

# Create KV namespace for props caching
echo "📦 Creating KV namespace for props caching..."
PROPS_CACHE_ID=$(wrangler kv:namespace create "PROPS_CACHE" --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$PROPS_CACHE_ID" ]; then
    echo "❌ Failed to create KV namespace"
    exit 1
fi

echo "✅ Created KV namespace: $PROPS_CACHE_ID"

# Update wrangler.toml with the actual KV namespace ID
sed -i.bak "s/your-props-cache-kv-namespace-id/$PROPS_CACHE_ID/g" sportsgameodds-wrangler.toml

# Deploy the worker
echo "🚀 Deploying edge cache worker..."
wrangler deploy --config sportsgameodds-wrangler.toml

if [ $? -eq 0 ]; then
    echo "✅ Edge Cache Worker deployed successfully!"
    echo "🌐 Endpoint: https://statpedia-sportsgameodds-cache.statpedia.workers.dev"
    echo "📊 KV Namespace: $PROPS_CACHE_ID"
    echo ""
    echo "🔧 Usage:"
    echo "  GET /sportsgameodds?league=NFL&season=2025&limit=10"
    echo "  GET /sportsgameodds?league=NBA&season=2025&limit=5"
    echo ""
    echo "⚡ Cache TTLs:"
    echo "  - NFL: 5 minutes"
    echo "  - NBA: 10 minutes" 
    echo "  - MLB: 3 minutes"
    echo "  - NHL: 5 minutes"
    echo "  - Historical data: 24 hours"
else
    echo "❌ Deployment failed"
    exit 1
fi
