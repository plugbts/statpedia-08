#!/bin/bash

# Nightly Analytics Precompute Cron Job
# This script should be run daily at 2:00 AM to precompute player analytics

# Set working directory to the project root
cd "$(dirname "$0")/.."

# Set environment variables
export NODE_ENV=production

# Log file for this run
LOG_FILE="logs/nightly-precompute-$(date +%Y-%m-%d).log"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_with_timestamp "🚀 Starting nightly analytics precompute job"

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    log_with_timestamp "❌ Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY"
    exit 1
fi

# Run the precompute job
log_with_timestamp "📊 Running analytics precompute for season 2025"
npm run precompute-analytics:2025 2>&1 | tee -a "$LOG_FILE"

# Check if the job completed successfully
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_with_timestamp "✅ Nightly analytics precompute completed successfully"
    
    # Optional: Send success notification (email, Slack, etc.)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"✅ Nightly analytics precompute completed successfully"}' \
    #     $SLACK_WEBHOOK_URL
    
else
    log_with_timestamp "❌ Nightly analytics precompute failed"
    
    # Optional: Send failure notification
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"❌ Nightly analytics precompute failed. Check logs for details."}' \
    #     $SLACK_WEBHOOK_URL
    
    exit 1
fi

log_with_timestamp "🏁 Nightly analytics precompute job finished"
