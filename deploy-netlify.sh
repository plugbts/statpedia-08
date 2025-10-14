#!/bin/bash

# 🚀 StatPedia Deployment Script for Netlify
# This script deploys the StatPedia application to Netlify

set -e  # Exit on any error

echo "🚀 Starting StatPedia Deployment to Netlify..."
echo ""

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

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    print_error "Netlify CLI is not installed. Please install it first:"
    echo "npm install -g netlify-cli"
    exit 1
fi

print_success "Netlify CLI found: $(netlify --version)"

# Check if user is logged in
print_status "Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
    print_warning "Not logged in to Netlify. Please run: netlify login"
    echo ""
    echo "After logging in, run this script again."
    exit 1
fi

print_success "Netlify authentication verified"

# Build the application
print_status "Building application..."
if npm run build; then
    print_success "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Deploy to Netlify
print_status "Deploying to Netlify..."
if netlify deploy --prod --dir=dist; then
    print_success "Deployment successful!"
else
    print_error "Deployment failed"
    exit 1
fi

# Get deployment URL
print_status "Getting deployment URL..."
DEPLOYMENT_URL=$(netlify status | grep "Website URL" | awk '{print $3}')

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Deployment Details:"
echo "  🌐 URL: $DEPLOYMENT_URL"
echo "  📊 Dashboard: https://app.netlify.com"
echo ""
echo "🔧 Next Steps:"
echo ""
echo "1. Set up environment variables in Netlify dashboard:"
echo "   - VITE_AUTH_ENDPOINT: Your auth endpoint URL"
echo "   - NEON_DATABASE_URL: Your Neon database connection string"
echo "   - JWT_SECRET: Your JWT secret key"
echo ""
echo "2. Configure custom domain (optional):"
echo "   - Add your domain in Netlify dashboard"
echo "   - Update DNS records as instructed"
echo ""
echo "3. Test the deployment:"
echo "   - Visit $DEPLOYMENT_URL"
echo "   - Test authentication flow"
echo "   - Verify all features work correctly"
echo ""
echo "🎯 Benefits Now Active:"
echo "  ✅ Global CDN with edge caching"
echo "  ✅ Automatic HTTPS"
echo "  ✅ Zero-config deployments"
echo "  ✅ Automatic scaling"
echo "  ✅ Built-in monitoring"
echo ""
echo "📊 Your StatPedia application is now live!"
echo ""
