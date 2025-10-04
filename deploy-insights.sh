#!/bin/bash

# Deploy Insights Functions Script
# This script deploys the insights functions directly to Supabase

echo "🚀 Deploying Insights Functions to Supabase..."

# Read the SQL file and execute it
psql "$(npx supabase status --output env | grep DATABASE_URL | cut -d'=' -f2-)" -f deploy-insights-functions.sql

echo "✅ Insights functions deployed successfully!"
echo "📊 You can now test the insights tab in your application."
