#!/bin/bash

# Combined Nightly Job Cron Script
# Runs both incremental ingestion and analytics precomputation
# This script should be run daily at 2:00 AM

# Set working directory to the project root
cd "$(dirname "$0")/.."

# Set environment variables
export NODE_ENV=production

# Log file for this run
LOG_FILE="logs/combined-nightly-$(date +%Y-%m-%d).log"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_with_timestamp "🚀 Starting combined nightly job (ingestion + analytics)"

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] && [ -z "$VITE_SUPABASE_URL" ]; then
    log_with_timestamp "❌ Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ] && [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    log_with_timestamp "❌ Missing required environment variable: SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY"
    exit 1
fi

if [ -z "$SPORTSGAMEODDS_API_KEY" ]; then
    log_with_timestamp "❌ Missing required environment variable: SPORTSGAMEODDS_API_KEY"
    exit 1
fi

# Run the combined nightly job
log_with_timestamp "📊 Running combined nightly job (ingestion + analytics)"
npm run nightly-job 2>&1 | tee -a "$LOG_FILE"

# Check if the job completed successfully
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_with_timestamp "✅ Combined nightly job completed successfully"
    
    # Optional: Send success notification (email, Slack, etc.)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"✅ Combined nightly job completed successfully - ingestion and analytics updated"}' \
    #     $SLACK_WEBHOOK_URL
    
else
    log_with_timestamp "❌ Combined nightly job failed"
    
    # Optional: Send failure notification
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"❌ Combined nightly job failed. Check logs for details."}' \
    #     $SLACK_WEBHOOK_URL
    
    exit 1
fi

log_with_timestamp "🏁 Combined nightly job finished"
