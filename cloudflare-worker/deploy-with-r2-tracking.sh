#!/bin/bash

# Enhanced Cloudflare Worker Deployment Script with R2 Usage Tracking
# This script deploys the Cloudflare Worker with automatic R2 usage monitoring

set -e

echo "🚀 Deploying Statpedia Player Props API with R2 Usage Tracking..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run: wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI found and authenticated"

# Backup original index.ts
if [ -f "src/index.ts" ]; then
    echo "📦 Backing up original index.ts..."
    cp src/index.ts src/index-backup.ts
fi

# Replace with enhanced version
echo "🔄 Installing enhanced version with R2 usage tracking..."
cp src/index-with-r2-tracking.ts src/index.ts

# Check if Supabase service key is configured
echo "🔍 Checking Supabase configuration..."

# You'll need to replace this with your actual Supabase service key
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-"your_supabase_service_key_here"}

if [ "$SUPABASE_SERVICE_KEY" = "your_supabase_service_key_here" ]; then
    echo "⚠️  WARNING: Supabase service key not configured!"
    echo "Please set the SUPABASE_SERVICE_KEY environment variable or update wrangler.toml"
    echo "You can find your service key in Supabase Dashboard > Settings > API"
    echo ""
    echo "To set it:"
    echo "export SUPABASE_SERVICE_KEY='your_actual_service_key'"
    echo "Then run this script again"
    echo ""
    read -p "Continue without R2 usage tracking? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Please configure Supabase service key first."
        exit 1
    fi
fi

# Update wrangler.toml with actual service key if provided
if [ "$SUPABASE_SERVICE_KEY" != "your_supabase_service_key_here" ]; then
    echo "🔧 Updating wrangler.toml with Supabase service key..."
    sed -i.bak "s/your_supabase_service_key_here/$SUPABASE_SERVICE_KEY/g" wrangler.toml
fi

# Deploy to staging first
echo "🚀 Deploying to staging environment..."
wrangler deploy --env staging

if [ $? -eq 0 ]; then
    echo "✅ Staging deployment successful!"
    
    # Test the staging deployment
    echo "🧪 Testing staging deployment..."
    STAGING_URL="https://statpedia-player-props-staging.statpedia.workers.dev"
    
    # Test health endpoint
    if curl -s "$STAGING_URL/api/health" > /dev/null; then
        echo "✅ Staging health check passed"
    else
        echo "⚠️  Staging health check failed, but deployment succeeded"
    fi
    
    # Test player props endpoint
    echo "🧪 Testing player props endpoint..."
    RESPONSE=$(curl -s "$STAGING_URL/api/player-props?sport=nfl")
    if echo "$RESPONSE" | grep -q "success"; then
        echo "✅ Player props endpoint working"
    else
        echo "⚠️  Player props endpoint may have issues"
    fi
    
    # Ask if user wants to deploy to production
    echo ""
    read -p "Deploy to production? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to production..."
        wrangler deploy --env production
        
        if [ $? -eq 0 ]; then
            echo "✅ Production deployment successful!"
            
            # Test production deployment
            echo "🧪 Testing production deployment..."
            PRODUCTION_URL="https://statpedia-player-props.statpedia.workers.dev"
            
            if curl -s "$PRODUCTION_URL/api/health" > /dev/null; then
                echo "✅ Production health check passed"
            else
                echo "⚠️  Production health check failed, but deployment succeeded"
            fi
            
            echo ""
            echo "🎉 Deployment complete!"
            echo ""
            echo "📊 R2 Usage Tracking Features:"
            echo "  ✅ Automatic logging of R2 operations (GET, PUT, DELETE)"
            echo "  ✅ Cost calculation based on Cloudflare R2 pricing"
            echo "  ✅ Integration with Supabase for persistent storage"
            echo "  ✅ Real-time monitoring in admin panel"
            echo ""
            echo "🔗 URLs:"
            echo "  Staging: $STAGING_URL"
            echo "  Production: $PRODUCTION_URL"
            echo ""
            echo "📈 Next Steps:"
            echo "  1. Check the admin panel 'R2 Usage' tab to see usage data"
            echo "  2. Monitor costs and usage patterns"
            echo "  3. Set up alerts if usage approaches limits"
            echo ""
            echo "⚠️  Important: Make sure to update your frontend to use the new URLs!"
            
        else
            echo "❌ Production deployment failed"
            exit 1
        fi
    else
        echo "ℹ️  Skipping production deployment. Staging is ready for testing."
    fi
    
else
    echo "❌ Staging deployment failed"
    exit 1
fi

# Restore original index.ts
if [ -f "src/index-backup.ts" ]; then
    echo "🔄 Restoring original index.ts..."
    mv src/index-backup.ts src/index.ts
fi

# Restore wrangler.toml backup
if [ -f "wrangler.toml.bak" ]; then
    echo "🔄 Restoring wrangler.toml..."
    mv wrangler.toml.bak wrangler.toml
fi

echo ""
echo "🎯 R2 Usage Tracking Setup Complete!"
echo ""
echo "The enhanced Cloudflare Worker now includes:"
echo "  • Automatic R2 operation logging"
echo "  • Cost calculation and tracking"
echo "  • Integration with your Supabase database"
echo "  • Real-time monitoring in the admin panel"
echo ""
echo "To view usage data, go to the admin panel and click the 'R2 Usage' tab."
echo "The system will automatically track all R2 operations and costs."
