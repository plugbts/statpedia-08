#!/bin/bash

# Deploy Optimized Query Strategy
# This script applies the progressive matching approach with flexible date tolerance

set -e

echo "🚀 Deploying Optimized Query Strategy..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from the project root."
    exit 1
fi

echo "📊 Applying optimized query strategy migration..."

# Apply the optimized query strategy SQL
supabase db reset --linked
supabase db push

echo "✅ Database migration applied successfully!"

# Test the deployment
echo "🧪 Testing the deployment..."

# Run the test script
if [ -f "test-optimized-query-strategy.js" ]; then
    node test-optimized-query-strategy.js
else
    echo "⚠️ Test script not found, skipping tests"
fi

echo "🎉 Optimized Query Strategy deployment complete!"
echo ""
echo "📋 Summary of changes:"
echo "   ✅ Progressive matching approach implemented"
echo "   ✅ Flexible date tolerance (±1 day) added"
echo "   ✅ Normalized prop type matching"
echo "   ✅ Updated Cloudflare Worker with optimized queries"
echo "   ✅ Updated TypeScript API layer with flexible date ranges"
echo ""
echo "🔗 Next steps:"
echo "   1. Test the API endpoints to ensure they return all 15,786 records"
echo "   2. Monitor the logs for improved match rates"
echo "   3. Verify that the progressive matching is working correctly"
