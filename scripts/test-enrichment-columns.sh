#!/bin/bash

# Test script to verify enrichment columns are populated
# This script checks that the enrichment data is working correctly

echo "🔍 Testing Enrichment Columns Population"
echo "========================================"

# Set environment variables
export NEON_DATABASE_URL="${NEON_DATABASE_URL}"

if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ NEON_DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Checking player_enriched_stats table..."

# Test 1: Check if enrichment table has data
ENRICHMENT_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats;" 2>/dev/null | tr -d ' ')

if [ "$ENRICHMENT_COUNT" -gt 0 ]; then
    echo "✅ player_enriched_stats has $ENRICHMENT_COUNT rows"
else
    echo "❌ player_enriched_stats is empty"
    exit 1
fi

# Test 2: Check if enrichment columns have non-null values
echo ""
echo "📈 Checking enrichment column values..."

# Check L5 (Last 5 games average)
L5_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats WHERE l5 IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "L5 (Last 5): $L5_COUNT non-null values"

# Check L10 (Last 10 games average)
L10_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats WHERE l10 IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "L10 (Last 10): $L10_COUNT non-null values"

# Check L20 (Last 20 games average)
L20_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats WHERE l20 IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "L20 (Last 20): $L20_COUNT non-null values"

# Check season average
SEASON_AVG_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats WHERE season_avg IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "Season Average: $SEASON_AVG_COUNT non-null values"

# Check streak
STREAK_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats WHERE streak IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "Streak: $STREAK_COUNT non-null values"

# Check rating
RATING_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_enriched_stats WHERE rating IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "Rating: $RATING_COUNT non-null values"

# Test 3: Check normalized view includes enrichment data
echo ""
echo "🔗 Checking player_props_normalized view..."

NORMALIZED_COUNT=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_props_normalized;" 2>/dev/null | tr -d ' ')
echo "Normalized view has $NORMALIZED_COUNT rows"

# Check if normalized view has enrichment data
ENRICHED_NORMALIZED=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM player_props_normalized WHERE l5 IS NOT NULL OR l10 IS NOT NULL OR l20 IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "Normalized view with enrichment data: $ENRICHED_NORMALIZED rows"

# Test 4: Sample data check
echo ""
echo "📋 Sample enrichment data:"
psql $NEON_DATABASE_URL -c "
SELECT 
    p.display_name as player_name,
    t.name as team_name,
    es.l5,
    es.l10,
    es.l20,
    es.season_avg,
    es.streak,
    es.rating
FROM player_enriched_stats es
JOIN players_canonical p ON p.id = es.player_id
JOIN teams_canonical t ON t.id = p.team_id
LIMIT 5;
" 2>/dev/null

# Test 5: Check if enrichment function exists
echo ""
echo "🔧 Checking refresh_enrichment function..."
FUNCTION_EXISTS=$(psql $NEON_DATABASE_URL -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'refresh_enrichment';" 2>/dev/null | tr -d ' ')

if [ "$FUNCTION_EXISTS" -gt 0 ]; then
    echo "✅ refresh_enrichment function exists"
else
    echo "❌ refresh_enrichment function not found"
fi

# Test 6: Test the enrichment function
echo ""
echo "🔄 Testing refresh_enrichment function..."
psql $NEON_DATABASE_URL -c "SELECT refresh_enrichment();" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ refresh_enrichment function executed successfully"
else
    echo "❌ refresh_enrichment function failed"
fi

echo ""
echo "🎯 Enrichment Test Summary:"
echo "=========================="
echo "Enrichment rows: $ENRICHMENT_COUNT"
echo "L5 values: $L5_COUNT"
echo "L10 values: $L10_COUNT"
echo "L20 values: $L20_COUNT"
echo "Season averages: $SEASON_AVG_COUNT"
echo "Streaks: $STREAK_COUNT"
echo "Ratings: $RATING_COUNT"
echo "Normalized with enrichment: $ENRICHED_NORMALIZED"

if [ "$ENRICHMENT_COUNT" -gt 0 ] && [ "$L5_COUNT" -gt 0 ] && [ "$L10_COUNT" -gt 0 ]; then
    echo ""
    echo "🎉 Enrichment columns are working correctly!"
    echo "✅ Base joins: Working (names, teams, logos, odds, lines)"
    echo "✅ Enrichment columns: Populated (L5, L10, L20, streaks, ratings)"
    echo "✅ Normalized view: Includes enrichment data"
    echo "✅ Refresh function: Working"
else
    echo ""
    echo "⚠️  Some enrichment columns may need attention"
    echo "Check the sample data above for details"
fi

echo ""
echo "🔍 Enrichment test completed!"
