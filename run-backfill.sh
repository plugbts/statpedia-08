#!/bin/bash

# Run Historical Backfill Job
# This script executes the backfill job locally or in a serverless environment

echo "🚀 Starting Historical Backfill Job"
echo "⏰ Started at: $(date)"
echo "="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if environment variables are set
if [ -z "$SPORTSGAMEODDS_API_KEY" ]; then
    echo "⚠️ SPORTSGAMEODDS_API_KEY not set in environment"
    echo "Please set your API key:"
    echo "export SPORTSGAMEODDS_API_KEY=your_api_key_here"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found"
    echo "Please create a .env file with your Supabase credentials:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "SPORTSGAMEODDS_API_KEY=your_api_key"
    exit 1
fi

echo "✅ Environment check passed"
echo "🏃 Running backfill job..."
echo ""

# Run the backfill job
node backfillJob.js

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backfill job completed successfully!"
    echo "⏰ Finished at: $(date)"
else
    echo ""
    echo "❌ Backfill job failed!"
    echo "⏰ Failed at: $(date)"
    exit 1
fi
