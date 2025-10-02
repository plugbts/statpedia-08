#!/bin/bash

# 🔧 Local Supabase Setup Script
# This script helps you authenticate and sync your local repository with Supabase

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔧 Setting up Local Supabase Connection..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Installing now..."
    if command -v brew &> /dev/null; then
        brew install supabase/tap/supabase
        print_success "Supabase CLI installed via Homebrew"
    else
        print_error "Homebrew not found. Please install Supabase CLI manually:"
        echo "Visit: https://supabase.com/docs/guides/cli/getting-started"
        exit 1
    fi
fi

print_success "Supabase CLI found: $(supabase --version)"

# Check current directory structure
if [ ! -f "supabase/config.toml" ]; then
    print_error "supabase/config.toml not found. Are you in the correct directory?"
    exit 1
fi

print_success "Supabase project configuration found"

# Read project ID from config
PROJECT_ID=$(grep "project_id" supabase/config.toml | cut -d'"' -f2)
print_status "Project ID: $PROJECT_ID"

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. 🔐 Authenticate with Supabase:"
echo "   Run: supabase login"
echo "   This will open your browser for authentication"
echo ""
echo "2. 🔗 Link to your remote project:"
echo "   Run: supabase link --project-ref $PROJECT_ID"
echo ""
echo "3. 📊 Check remote database status:"
echo "   Run: supabase db remote commit"
echo ""
echo "4. 🚀 Deploy the API management system:"
echo "   Run: ./deploy.sh"
echo ""
echo "🎯 Alternative: Manual Deployment Steps"
echo ""
echo "If you prefer to deploy manually:"
echo ""
echo "A. Deploy database migration:"
echo "   supabase db push"
echo ""
echo "B. Deploy Edge Functions:"
echo "   supabase functions deploy sportsgameodds-api"
echo "   supabase functions deploy background-poller" 
echo "   supabase functions deploy api-analytics"
echo ""
echo "C. Configure API settings:"
echo "   Go to: https://$PROJECT_ID.supabase.co/project/$PROJECT_ID/sql"
echo "   Run: UPDATE api_config SET value = '\"d5dc1f00bc42133550bc1605dd8f457f\"' WHERE key = 'sportsgameodds_api_key';"
echo ""
echo "D. Start background polling:"
echo "   Get your anon key from: https://$PROJECT_ID.supabase.co/project/$PROJECT_ID/settings/api"
echo "   curl -X GET \"https://$PROJECT_ID.supabase.co/functions/v1/background-poller?action=start\" \\"
echo "        -H \"apikey: YOUR_ANON_KEY\""
echo ""
echo "🔍 Troubleshooting:"
echo ""
echo "If you get authentication errors:"
echo "• Make sure you're logged in: supabase login"
echo "• Check project linking: supabase projects list"
echo "• Verify project ID in supabase/config.toml"
echo ""
echo "If functions fail to deploy:"
echo "• Check function syntax: supabase functions serve [function-name]"
echo "• Verify dependencies in function files"
echo "• Check Supabase project permissions"
echo ""
echo "📚 Documentation:"
echo "• Full deployment guide: DEPLOYMENT_INSTRUCTIONS.md"
echo "• API management overview: deploy-server-api.md"
echo ""
echo "✨ Ready to deploy your server-side API management system!"
echo ""
