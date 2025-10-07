#!/bin/bash

# Deploy Nightly Job as Supabase Edge Function
# This script deploys the nightly job and sets up cron scheduling

set -e

echo "🚀 Deploying Nightly Job Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    echo "   Run 'supabase init' first or navigate to project root"
    exit 1
fi

# Deploy the function
echo "📦 Deploying nightly-job function..."
supabase functions deploy nightly-job

# Set up environment variables
echo "🔑 Setting up environment variables..."
read -p "Enter your SPORTSGAMEODDS_API_KEY: " -s API_KEY
echo
supabase secrets set SPORTSGAMEODDS_API_KEY="$API_KEY"

# Test the function
echo "🧪 Testing the function..."
supabase functions invoke nightly-job

echo "✅ Nightly job deployed successfully!"

# Set up cron job
echo "⏰ Setting up cron job..."
echo "To schedule the nightly job to run at 5 AM UTC daily, run this SQL in your Supabase dashboard:"
echo
echo "SELECT cron.schedule("
echo "  'nightly-job',"
echo "  '0 5 * * *',"
echo "  \$\$"
echo "  SELECT net.http_post("
echo "    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/nightly-job',"
echo "    headers := '{\"Authorization\": \"Bearer YOUR-SERVICE-ROLE-KEY\"}'::jsonb"
echo "  );"
echo "  \$\$"
echo ");"
echo
echo "Replace YOUR-PROJECT-REF and YOUR-SERVICE-ROLE-KEY with your actual values."

echo "🎉 Deployment complete!"
echo
echo "Next steps:"
echo "1. Enable pg_cron extension in Supabase dashboard"
echo "2. Run the cron setup SQL above"
echo "3. Monitor logs with: supabase functions logs nightly-job"
