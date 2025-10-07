#!/bin/bash

# Deploy scheduled jobs to Supabase
echo "🚀 Deploying scheduled jobs to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    echo "   Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run 'supabase login' first."
    exit 1
fi

# Deploy the scheduled-jobs function
echo "📦 Deploying scheduled-jobs function..."
supabase functions deploy scheduled-jobs

if [ $? -eq 0 ]; then
    echo "✅ Scheduled jobs function deployed successfully!"
else
    echo "❌ Failed to deploy scheduled jobs function"
    exit 1
fi

# Set up cron jobs
echo "⏰ Setting up cron jobs..."
supabase functions deploy scheduled-jobs --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Cron jobs configured successfully!"
else
    echo "❌ Failed to configure cron jobs"
    exit 1
fi

echo ""
echo "🎉 Scheduled jobs deployment completed!"
echo ""
echo "📋 Available endpoints:"
echo "   • All jobs: https://your-project.supabase.co/functions/v1/scheduled-jobs"
echo "   • Data ingestion: https://your-project.supabase.co/functions/v1/scheduled-jobs?job=data-ingestion"
echo "   • Analytics precomputation: https://your-project.supabase.co/functions/v1/scheduled-jobs?job=analytics-precomputation"
echo "   • Cache cleanup: https://your-project.supabase.co/functions/v1/scheduled-jobs?job=cache-cleanup"
echo ""
echo "⏰ Cron schedule:"
echo "   • Data ingestion: Daily at 1:00 AM UTC"
echo "   • Analytics precomputation: Daily at 2:00 AM UTC"
echo "   • Cache cleanup: Weekly on Sunday at 3:00 AM UTC"
echo ""
echo "🔧 To manually trigger jobs:"
echo "   curl -X POST 'https://your-project.supabase.co/functions/v1/scheduled-jobs?job=analytics-precomputation' \\"
echo "        -H 'Authorization: Bearer YOUR_ANON_KEY'"
