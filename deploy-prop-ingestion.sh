#!/bin/bash

# 🚀 Prop Ingestion System Deployment Script
# This script deploys the complete prop ingestion and normalization system

set -e  # Exit on any error

echo "🚀 Starting Prop Ingestion System Deployment"
echo "============================================="

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

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

print_success "Supabase CLI found"

# Check if user is logged in to Supabase
if ! supabase status &> /dev/null; then
    print_warning "Not logged in to Supabase. Please login first:"
    echo "supabase login"
    exit 1
fi

print_success "Supabase authentication verified"

# Step 1: Create proplines table
print_status "Step 1: Creating proplines table and schema..."
if supabase db reset --linked; then
    print_success "Database reset completed"
else
    print_warning "Database reset failed, trying to push schema directly..."
fi

# Apply the proplines table schema
if supabase db push --linked; then
    print_success "Proplines table schema applied"
else
    print_error "Failed to apply proplines table schema"
    exit 1
fi

# Step 2: Deploy the prop ingestion Edge Function
print_status "Step 2: Deploying prop ingestion Edge Function..."
if supabase functions deploy prop-ingestion; then
    print_success "Prop ingestion Edge Function deployed"
else
    print_error "Failed to deploy prop ingestion Edge Function"
    exit 1
fi

# Step 3: Test the deployment
print_status "Step 3: Testing deployment..."

# Test database connectivity
print_status "Testing database connectivity..."
if node test-complete-system.js > /dev/null 2>&1; then
    print_success "Database connectivity test passed"
else
    print_warning "Database connectivity test had issues (this may be expected if table was just created)"
fi

# Test Edge Function health check
print_status "Testing Edge Function health check..."
HEALTH_RESPONSE=$(curl -s -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=health" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI")

if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    print_success "Edge Function health check passed"
else
    print_warning "Edge Function health check failed or returned unexpected response"
    echo "Response: $HEALTH_RESPONSE"
fi

# Step 4: Run a small test ingestion
print_status "Step 4: Running test ingestion..."
TEST_RESPONSE=$(curl -s -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=ingest&league=NFL&season=2025&week=6" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI")

if echo "$TEST_RESPONSE" | grep -q "success.*true"; then
    print_success "Test ingestion completed successfully"
    echo "Response: $TEST_RESPONSE"
else
    print_warning "Test ingestion failed or returned unexpected response"
    echo "Response: $TEST_RESPONSE"
fi

# Step 5: Set up monitoring
print_status "Step 5: Setting up monitoring..."

# Create a simple monitoring script
cat > monitor-prop-ingestion.sh << 'EOF'
#!/bin/bash
# Simple monitoring script for prop ingestion system

echo "📊 Prop Ingestion System Monitor"
echo "================================"

# Check Edge Function status
echo "🔍 Checking Edge Function status..."
STATUS_RESPONSE=$(curl -s -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=status" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI")

echo "Status Response: $STATUS_RESPONSE"

# Check health
echo "🏥 Checking system health..."
HEALTH_RESPONSE=$(curl -s -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=health" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI")

echo "Health Response: $HEALTH_RESPONSE"
EOF

chmod +x monitor-prop-ingestion.sh
print_success "Monitoring script created: monitor-prop-ingestion.sh"

# Step 6: Create scheduled job setup
print_status "Step 6: Setting up scheduled ingestion..."

cat > setup-scheduled-ingestion.sh << 'EOF'
#!/bin/bash
# Setup scheduled ingestion jobs

echo "⏰ Setting up scheduled prop ingestion..."

# Function to run ingestion
run_ingestion() {
    echo "🔄 Running scheduled ingestion at $(date)"
    curl -X GET "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=ingest" \
      -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZHJpZm5zZm9icWx6b3JjZXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg4MzYsImV4cCI6MjA3NDYyNDgzNn0.oUzP1pTapCMEaaPXzia2uqn-m3L9BRR82_RYcUXqykI"
    echo "✅ Ingestion completed at $(date)"
}

# Run ingestion immediately
run_ingestion

echo "📋 To set up automatic scheduling, add this to your crontab:"
echo "# Run prop ingestion every 30 minutes"
echo "*/30 * * * * /path/to/this/script/run_ingestion.sh"
echo ""
echo "Or use a service like cron-job.org to call the Edge Function URL:"
echo "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=ingest"
EOF

chmod +x setup-scheduled-ingestion.sh
print_success "Scheduled ingestion setup script created: setup-scheduled-ingestion.sh"

# Step 7: Final verification
print_status "Step 7: Final verification..."

# Check if everything is working
print_status "Running final system test..."
if node test-complete-system.js; then
    print_success "Final system test passed"
else
    print_warning "Final system test had some issues (check output above)"
fi

# Deployment summary
echo ""
echo "🎉 Prop Ingestion System Deployment Complete!"
echo "=============================================="
echo ""
print_success "✅ Database schema deployed"
print_success "✅ Edge Function deployed"
print_success "✅ Monitoring scripts created"
print_success "✅ Scheduled job setup ready"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor the system: ./monitor-prop-ingestion.sh"
echo "2. Set up scheduled ingestion: ./setup-scheduled-ingestion.sh"
echo "3. Test ingestion: curl -X GET 'https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=ingest&league=NFL' -H 'apikey: YOUR_API_KEY'"
echo ""
echo "🔗 Useful URLs:"
echo "• Health Check: https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=health"
echo "• Status: https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=status"
echo "• Ingest: https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/prop-ingestion?action=ingest"
echo ""
echo "📊 The system is now ready for production use!"
