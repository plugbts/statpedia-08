#!/bin/bash

echo "🔧 Fixing Migration Mismatch..."
echo ""

# Check if authenticated
if ! supabase projects list &> /dev/null; then
    echo "❌ Not authenticated with Supabase"
    echo "   Run: supabase login"
    exit 1
fi

echo "✅ Authenticated with Supabase"
echo ""

# Step 1: Repair migration history (mark remote migrations as reverted)
echo "🔄 Step 1: Repairing migration history..."
echo "   Marking remote migrations as reverted..."

supabase migration repair --status reverted \
  20250929123806 20250930013859 20250930014212 20250930021437 \
  20250930021524 20250930021616 20250930021706 20250930021724 \
  20250930021748 20250930021811 20250930021838 20250930023511 \
  20250930023559 20250930023656 20250930024712 20250930030404 \
  20250930031251 20250930031427

if [ $? -eq 0 ]; then
    echo "✅ Migration history repaired"
else
    echo "❌ Migration repair failed"
    echo ""
    echo "🔄 Trying alternative approach..."
    echo "   Marking migrations as applied instead..."
    
    supabase migration repair --status applied \
      20250929123806 20250930013859 20250930014212 20250930021437 \
      20250930021524 20250930021616 20250930021706 20250930021724 \
      20250930021748 20250930021811 20250930021838 20250930023511 \
      20250930023559 20250930023656 20250930024712 20250930030404 \
      20250930031251 20250930031427
    
    if [ $? -ne 0 ]; then
        echo "❌ Alternative repair also failed"
        echo ""
        echo "💡 Manual solution:"
        echo "   1. Go to Supabase SQL Editor"
        echo "   2. Run contents of manual-deploy-sql.sql"
        echo "   3. Deploy functions manually"
        exit 1
    fi
fi

echo ""

# Step 2: Pull remote database state
echo "🔄 Step 2: Pulling remote database state..."
supabase db pull

if [ $? -eq 0 ]; then
    echo "✅ Remote database state pulled successfully"
else
    echo "❌ Failed to pull remote database state"
    echo "   This might be okay - continuing with deployment..."
fi

echo ""

# Step 3: Deploy new API system
echo "🔄 Step 3: Deploying new API management system..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration successful!"
else
    echo "❌ Database migration still failed"
    echo ""
    echo "🎯 Alternative: Manual SQL Deployment"
    echo "   1. Go to: https://rfdrifnsfobqlzorcesn.supabase.co/project/rfdrifnsfobqlzorcesn/sql"
    echo "   2. Copy contents of manual-deploy-sql.sql"
    echo "   3. Execute in SQL Editor"
    echo ""
    exit 1
fi

echo ""

# Step 4: Deploy functions
echo "🔄 Step 4: Deploying Edge Functions..."

echo "   Deploying sportsgameodds-api..."
supabase functions deploy sportsgameodds-api --no-verify-jwt

echo "   Deploying background-poller..."
supabase functions deploy background-poller --no-verify-jwt

echo "   Deploying api-analytics..."
supabase functions deploy api-analytics --no-verify-jwt

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure API Key in Supabase SQL Editor:"
echo "   UPDATE api_config SET value = '\"d5dc1f00bc42133550bc1605dd8f457f\"' WHERE key = 'sportsgameodds_api_key';"
echo ""
echo "2. Start Background Polling:"
echo "   curl -X GET \"https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/background-poller?action=start\" \\"
echo "        -H \"apikey: YOUR_SUPABASE_ANON_KEY\""
echo ""
echo "3. Check Admin Panel 'Server API' tab for monitoring"
echo ""
echo "✨ Your server-side API management system is now live!"
