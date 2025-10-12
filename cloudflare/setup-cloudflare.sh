#!/bin/bash

# StatPedia Cloudflare Setup Script
# This script sets up all the necessary Cloudflare resources

echo "🚀 Setting up Cloudflare for StatPedia..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login to Cloudflare (if not already logged in)
echo "🔐 Logging in to Cloudflare..."
wrangler login

# Create KV namespace for caching
echo "📦 Creating KV namespace for caching..."
wrangler kv:namespace create CACHE --preview

# Create R2 bucket for file storage
echo "🗄️ Creating R2 bucket for player images..."
wrangler r2 bucket create statpedia-player-images

# Deploy authentication worker
echo "🔑 Deploying authentication worker..."
wrangler deploy --name statpedia-auth auth-worker.js

# Deploy storage worker
echo "📁 Deploying storage worker..."
wrangler deploy --name statpedia-storage storage-worker.js

# Deploy proxy worker
echo "🌐 Deploying GraphQL proxy worker..."
wrangler deploy --name statpedia-proxy proxy-worker.js

echo "✅ Cloudflare setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure custom domains in Cloudflare dashboard"
echo "2. Set up DNS records:"
echo "   - auth.statpedia.com → statpedia-auth.your-subdomain.workers.dev"
echo "   - storage.statpedia.com → statpedia-storage.your-subdomain.workers.dev"
echo "   - api.statpedia.com → statpedia-proxy.your-subdomain.workers.dev"
echo "3. Enable orange cloud (proxy) for all domains"
echo "4. Configure caching rules in Cloudflare dashboard"
echo "5. Update environment variables in wrangler.toml"
