#!/bin/bash

# Deploy Statpedia Player Props to Cloudflare Workers
# This script sets up the complete Cloudflare Workers + R2 infrastructure

echo "🚀 Deploying Statpedia Player Props to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login to Cloudflare (if not already logged in)
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    wrangler login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create R2 bucket for caching
echo "🪣 Creating R2 bucket for player props cache..."
wrangler r2 bucket create statpedia-player-props-cache || echo "Bucket may already exist"

# Create KV namespace for analytics
echo "📊 Creating KV namespace for analytics..."
wrangler kv:namespace create "API_ANALYTICS" || echo "KV namespace may already exist"

# Deploy to staging
echo "🚀 Deploying to staging environment..."
wrangler deploy --env staging

# Test the deployment
echo "🧪 Testing staging deployment..."
STAGING_URL="https://statpedia-player-props-staging.your-subdomain.workers.dev"
curl -s "$STAGING_URL/api/health" && echo "✅ Staging deployment successful" || echo "❌ Staging deployment failed"

# Deploy to production
echo "🚀 Deploying to production..."
read -p "Deploy to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler deploy --env production
    echo "✅ Production deployment complete!"
    echo "🌐 Production URL: https://statpedia-player-props.your-subdomain.workers.dev"
else
    echo "⏸️ Production deployment skipped"
fi

echo "🎉 Deployment process complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update the baseUrl in src/services/cloudflare-player-props-api.ts with your actual Worker URL"
echo "2. Test the player props tab in your app"
echo "3. Monitor performance in Cloudflare dashboard"
echo ""
echo "🔧 Configuration:"
echo "- R2 Bucket: statpedia-player-props-cache"
echo "- KV Namespace: API_ANALYTICS"
echo "- Environment Variables: Set in wrangler.toml"
