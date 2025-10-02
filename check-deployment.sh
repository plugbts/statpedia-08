#!/bin/bash

# 🔍 Deployment Status Checker
# This script helps you verify if the server-side API management system is deployed correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
}

echo "🔍 Checking Server-Side API Management System Deployment..."
echo ""

PROJECT_URL="https://rfdrifnsfobqlzorcesn.supabase.co"

# Get anon key from user
echo "📋 To check your deployment, we need your Supabase anon key."
echo "Get it from: ${PROJECT_URL}/project/rfdrifnsfobqlzorcesn/settings/api"
echo ""
read -p "Enter your Supabase anon key: " ANON_KEY

if [ -z "$ANON_KEY" ]; then
    print_error "Anon key is required to check deployment status"
    exit 1
fi

echo ""
echo "🚀 Testing Deployment..."
echo ""

# Test 1: Check SportGameOdds API proxy
print_status "Testing SportGameOdds API proxy..."
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_test.json \
  -X GET "${PROJECT_URL}/functions/v1/sportsgameodds-api?endpoint=player-props&sport=nfl" \
  -H "apikey: ${ANON_KEY}" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
    print_success "SportGameOdds API proxy is working"
    # Check if we got actual data
    if grep -q "success" /tmp/api_test.json 2>/dev/null; then
        print_success "API proxy returning valid data"
    else
        print_warning "API proxy responded but data format unclear"
    fi
else
    print_error "SportGameOdds API proxy failed (HTTP $RESPONSE)"
    if [ "$RESPONSE" = "000" ]; then
        print_error "Could not connect to function. Check if it's deployed."
    fi
fi

# Test 2: Check background poller
print_status "Testing background poller..."
POLLER_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/poller_test.json \
  -X GET "${PROJECT_URL}/functions/v1/background-poller?action=status" \
  -H "apikey: ${ANON_KEY}" 2>/dev/null || echo "000")

if [ "$POLLER_RESPONSE" = "200" ]; then
    print_success "Background poller is accessible"
    if grep -q "success" /tmp/poller_test.json 2>/dev/null; then
        print_success "Background poller returning status"
    fi
else
    print_error "Background poller failed (HTTP $POLLER_RESPONSE)"
fi

# Test 3: Check analytics API (requires auth)
print_status "Testing analytics API..."
ANALYTICS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/analytics_test.json \
  -X GET "${PROJECT_URL}/functions/v1/api-analytics?action=health" \
  -H "apikey: ${ANON_KEY}" 2>/dev/null || echo "000")

if [ "$ANALYTICS_RESPONSE" = "200" ] || [ "$ANALYTICS_RESPONSE" = "403" ]; then
    print_success "Analytics API is deployed (may require admin auth)"
else
    print_error "Analytics API failed (HTTP $ANALYTICS_RESPONSE)"
fi

echo ""
echo "📊 Deployment Summary:"
echo ""

# Count successful tests
TESTS_PASSED=0
if [ "$RESPONSE" = "200" ]; then
    ((TESTS_PASSED++))
fi
if [ "$POLLER_RESPONSE" = "200" ]; then
    ((TESTS_PASSED++))
fi
if [ "$ANALYTICS_RESPONSE" = "200" ] || [ "$ANALYTICS_RESPONSE" = "403" ]; then
    ((TESTS_PASSED++))
fi

echo "✅ Tests Passed: $TESTS_PASSED/3"

if [ $TESTS_PASSED -eq 3 ]; then
    print_success "🎉 All functions deployed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start background polling:"
    echo "   curl -X GET \"${PROJECT_URL}/functions/v1/background-poller?action=start\" \\"
    echo "        -H \"apikey: ${ANON_KEY}\""
    echo ""
    echo "2. Check your Admin panel > Server API tab for monitoring"
    echo ""
    echo "3. Monitor API usage reduction in real-time"
    echo ""
elif [ $TESTS_PASSED -eq 0 ]; then
    print_error "❌ No functions are working. Check deployment."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Verify functions are deployed in Supabase dashboard"
    echo "2. Check function logs for errors"
    echo "3. Try manual deployment: see TROUBLESHOOT_DEPLOYMENT.md"
    echo ""
else
    print_warning "⚠️  Partial deployment detected."
    echo ""
    echo "🔧 Some functions may need redeployment:"
    if [ "$RESPONSE" != "200" ]; then
        echo "- sportsgameodds-api function"
    fi
    if [ "$POLLER_RESPONSE" != "200" ]; then
        echo "- background-poller function"
    fi
    if [ "$ANALYTICS_RESPONSE" != "200" ] && [ "$ANALYTICS_RESPONSE" != "403" ]; then
        echo "- api-analytics function"
    fi
fi

echo ""
echo "📚 Documentation:"
echo "- Troubleshooting: TROUBLESHOOT_DEPLOYMENT.md"
echo "- Manual setup: manual-deploy-sql.sql"
echo "- Full guide: DEPLOYMENT_INSTRUCTIONS.md"
echo ""

# Cleanup
rm -f /tmp/api_test.json /tmp/poller_test.json /tmp/analytics_test.json
