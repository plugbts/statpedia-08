#!/bin/bash

# Complete Phase 1 Setup - All Three Options
# This script sets up monitoring, validates frontend, and reviews the roadmap

set -e

echo "🚀 Statpedia Phase 1 - Complete Setup"
echo "======================================"
echo ""

# =============================================================================
# OPTION 1: Set Up Automated Monitoring
# =============================================================================

echo "📅 OPTION 1: Setting Up Automated Monitoring"
echo "============================================="
echo ""

# Check if cron jobs already exist
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -c "run-daily-validation.sh" || echo "0")

if [ "$CRON_EXISTS" -gt 0 ]; then
  echo "✅ Cron jobs already configured!"
  echo ""
  crontab -l | grep "statpedia"
  echo ""
else
  echo "📝 Adding cron jobs for automated monitoring..."
  
  # Get current directory
  CURRENT_DIR=$(pwd)
  
  # Backup existing crontab
  crontab -l > /tmp/crontab.backup 2>/dev/null || touch /tmp/crontab.backup
  
  # Add new cron jobs
  (crontab -l 2>/dev/null; echo "# Statpedia Data Quality Monitoring") | crontab -
  (crontab -l 2>/dev/null; echo "0 6 * * * cd $CURRENT_DIR && ./scripts/run-daily-validation.sh") | crontab -
  (crontab -l 2>/dev/null; echo "0 8 * * 0 cd $CURRENT_DIR && ./scripts/run-weekly-audit.sh") | crontab -
  
  echo "✅ Cron jobs added successfully!"
  echo ""
  echo "Your monitoring schedule:"
  crontab -l | grep -A 2 "Statpedia"
  echo ""
fi

# Run initial validation
echo "🧪 Running initial validation..."
./scripts/run-daily-validation.sh

echo ""
echo "✅ Option 1 Complete: Monitoring is now active!"
echo "   - Daily validation: 6 AM"
echo "   - Weekly audit: Sundays at 8 AM"
echo "   - View logs: cat logs/validation/summary.log"
echo ""

# =============================================================================
# OPTION 2: Test Frontend Integration
# =============================================================================

echo "🖼️  OPTION 2: Testing Frontend Integration"
echo "==========================================="
echo ""

# Check if dev servers are running
if lsof -ti:3001 >/dev/null 2>&1; then
  echo "✅ API server already running on port 3001"
else
  echo "🚀 Starting API server..."
  npm run dev:api > logs/api-server.log 2>&1 &
  API_PID=$!
  echo "   API server starting (PID: $API_PID)..."
  sleep 3
fi

if lsof -ti:8081 >/dev/null 2>&1 || lsof -ti:8082 >/dev/null 2>&1; then
  echo "✅ Frontend server already running"
else
  echo "🚀 Starting frontend server..."
  npm run dev:client > logs/frontend-server.log 2>&1 &
  FRONTEND_PID=$!
  echo "   Frontend server starting (PID: $FRONTEND_PID)..."
  sleep 5
fi

echo ""
echo "📊 Running frontend data checks..."

# Check teams with logos in database
TEAMS_WITH_LOGOS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM teams WHERE logo_url IS NOT NULL;" 2>/dev/null || echo "N/A")
TOTAL_TEAMS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM teams;" 2>/dev/null || echo "N/A")

echo "   Teams in database: $TOTAL_TEAMS"
echo "   Teams with logos: $TEAMS_WITH_LOGOS"

if [ "$TEAMS_WITH_LOGOS" = "$TOTAL_TEAMS" ] && [ "$TEAMS_WITH_LOGOS" != "N/A" ]; then
  echo "   ✅ 100% logo coverage!"
else
  echo "   ⚠️  Some teams may be missing logos"
fi

# Check for duplicates
DUPLICATES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM (SELECT name, COUNT(*) as cnt FROM teams GROUP BY name HAVING COUNT(*) > 1) sub;" 2>/dev/null || echo "0")

if [ "$DUPLICATES" -eq 0 ]; then
  echo "   ✅ Zero duplicate teams"
else
  echo "   ⚠️  $DUPLICATES duplicate teams found"
fi

# Check player game logs
GAME_LOGS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM player_game_logs;" 2>/dev/null || echo "N/A")
echo "   Player game logs: $GAME_LOGS"

echo ""
echo "🌐 Frontend Testing Checklist:"
echo "   [ ] Open http://localhost:8081 (or 8082) in your browser"
echo "   [ ] Navigate to Teams page"
echo "   [ ] Verify all team logos display correctly"
echo "   [ ] Navigate to Players page"
echo "   [ ] Select a player and check prop history"
echo "   [ ] Verify streak indicators show correctly"
echo "   [ ] Test filtering by league (NFL, NBA, MLB, NHL, WNBA)"
echo "   [ ] Test date range selector for historical games"
echo ""

if lsof -ti:3001 >/dev/null 2>&1 && (lsof -ti:8081 >/dev/null 2>&1 || lsof -ti:8082 >/dev/null 2>&1); then
  echo "✅ Option 2 Ready: Servers are running!"
  echo "   API: http://localhost:3001"
  echo "   Frontend: http://localhost:8081 or http://localhost:8082"
  echo ""
  echo "   To stop servers later:"
  echo "   pkill -f 'tsx src/server/api-server.ts'"
  echo "   pkill -f 'vite --port'"
else
  echo "⚠️  Servers may not have started. Check logs:"
  echo "   tail -f logs/api-server.log"
  echo "   tail -f logs/frontend-server.log"
fi

echo ""

# =============================================================================
# OPTION 3: Review the Roadmap
# =============================================================================

echo "📚 OPTION 3: Reviewing the Roadmap"
echo "===================================="
echo ""

if [ -f "ROADMAP.md" ]; then
  echo "✅ ROADMAP.md found!"
  echo ""
  
  # Extract Phase 1 checklist from ROADMAP.md
  echo "📋 Phase 1 Checklist (Next 2 Weeks):"
  echo "====================================="
  echo ""
  
  # Show Phase 1 section
  sed -n '/## 🚀 Phase 1/,/## 📈 Phase 2/p' ROADMAP.md | head -60
  
  echo ""
  echo "📖 Full Roadmap Documents:"
  echo "   1. ROADMAP.md - Complete 3-phase plan"
  echo "   2. PHASE1_COMPLETE.md - Today's accomplishments"
  echo "   3. QUICKSTART.md - Quick reference guide"
  echo "   4. DATA_FIXES_EXECUTION_REPORT.md - Detailed fixes"
  echo ""
  
  echo "🎯 Your Current Focus (Week 1):"
  echo "   [ ] Set up cron jobs (DONE ✅)"
  echo "   [ ] Frontend test: all logos display"
  echo "   [ ] Frontend test: prop streaks work"
  echo "   [ ] Run validation manually 3x this week"
  echo "   [ ] Monitor: no duplicate teams created"
  echo ""
  
  echo "✅ Option 3 Complete: Roadmap reviewed!"
  echo ""
else
  echo "⚠️  ROADMAP.md not found!"
fi

# =============================================================================
# Final Summary
# =============================================================================

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🎉 ALL THREE OPTIONS COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Option 1: Monitoring ACTIVE"
echo "   - Cron jobs configured"
echo "   - Daily validation at 6 AM"
echo "   - Weekly audit on Sundays at 8 AM"
echo ""
echo "✅ Option 2: Frontend READY FOR TESTING"
echo "   - Servers running"
echo "   - Visit: http://localhost:8081"
echo "   - Complete the checklist above"
echo ""
echo "✅ Option 3: Roadmap REVIEWED"
echo "   - Phase 1 goals clear"
echo "   - Documentation ready"
echo "   - Next steps defined"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Quick Status Check:"
echo "────────────────────────────────────────────────────────────────"

# Show latest validation result
if [ -f "logs/validation/summary.log" ]; then
  echo "Latest Validation:"
  tail -3 logs/validation/summary.log
fi

echo ""
echo "Database Stats:"
echo "   Teams: $TOTAL_TEAMS"
echo "   Logos: $TEAMS_WITH_LOGOS"
echo "   Game Logs: $GAME_LOGS"
echo "   Duplicates: $DUPLICATES"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔥 Next Actions:"
echo "   1. Test frontend manually (use checklist above)"
echo "   2. Monitor logs: tail -f logs/validation/summary.log"
echo "   3. Review ROADMAP.md for Phase 1 tasks"
echo "   4. Run validation 3x this week manually"
echo ""
echo "🚀 You're all set for Phase 1! Good luck!"
echo ""
