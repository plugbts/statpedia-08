#!/bin/bash

echo "🔐 Checking Supabase Authentication Status..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed"
    echo "   Install with: brew install supabase/tap/supabase"
    exit 1
else
    echo "✅ Supabase CLI installed"
fi

# Check authentication status
echo ""
echo "🔍 Checking authentication..."

# Try to get user info (this will fail if not authenticated)
if supabase projects list &> /dev/null; then
    echo "✅ Authenticated successfully"
    echo ""
    echo "📋 Your Supabase projects:"
    supabase projects list
else
    echo "❌ Not authenticated"
    echo ""
    echo "🚀 To authenticate, run in your terminal:"
    echo "   supabase login"
    echo ""
    echo "💡 This will open your browser for one-time authentication"
fi

# Check if linked to project
echo ""
echo "🔗 Checking project linking..."

if [ -f "supabase/config.toml" ]; then
    PROJECT_REF=$(grep 'project_id' supabase/config.toml | awk -F '"' '{print $2}')
    if [ -n "$PROJECT_REF" ]; then
        echo "✅ Linked to project: $PROJECT_REF"
    else
        echo "❌ Project not linked"
        echo "   Run: supabase link --project-ref rfdrifnsfobqlzorcesn"
    fi
else
    echo "❌ No supabase/config.toml found"
    echo "   Run: supabase link --project-ref rfdrifnsfobqlzorcesn"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. If not authenticated: supabase login"
echo "2. If not linked: supabase link --project-ref rfdrifnsfobqlzorcesn"
echo "3. Deploy: ./deploy.sh"
