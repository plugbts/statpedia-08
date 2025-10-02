#!/bin/bash

# Deploy Enhanced SportsGameOdds API Function
# This replaces the existing function with usage tracking

echo "🚀 Deploying Enhanced SportsGameOdds API Function..."

# Check if we're in the right directory
if [ ! -f "supabase/functions/sportsgameodds-api-enhanced/index.ts" ]; then
    echo "❌ Enhanced function not found. Please run from project root."
    exit 1
fi

# Deploy the enhanced function
echo "📦 Deploying sportsgameodds-api-enhanced function..."
supabase functions deploy sportsgameodds-api-enhanced

if [ $? -eq 0 ]; then
    echo "✅ Enhanced function deployed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Update your frontend to use the new function endpoint"
    echo "2. Test the API calls with usage tracking"
    echo "3. Check the admin panel for usage data"
    echo ""
    echo "📊 Function endpoint: https://your-project.supabase.co/functions/v1/sportsgameodds-api-enhanced"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
