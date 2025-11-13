#!/bin/bash

# Statpedia Phase 1 Setup Script
# Sets up daily monitoring and validation for production readiness

set -e

echo "🚀 Setting up Statpedia Phase 1 Monitoring..."
echo ""

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
mkdir -p logs/validation
mkdir -p logs/audit

# Create a wrapper script for validation
echo "📝 Creating validation wrapper..."
cat > scripts/run-daily-validation.sh << 'EOF'
#!/bin/bash
# Daily validation runner with timestamped logging

DATE=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="logs/validation/validation_${DATE}.log"

echo "=== Statpedia Data Validation ===" > "$LOG_FILE"
echo "Date: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Run validation
npx tsx scripts/validate-data-quality.ts >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

# Check if validation passed
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Validation PASSED at $(date)" >> logs/validation/summary.log
else
  echo "❌ Validation FAILED at $(date)" >> logs/validation/summary.log
  # Here you could add email/Slack notification
  # curl -X POST https://hooks.slack.com/... -d "Validation failed!"
fi

# Keep only last 30 days of logs
find logs/validation -name "validation_*.log" -mtime +30 -delete

exit $EXIT_CODE
EOF

chmod +x scripts/run-daily-validation.sh

# Create audit wrapper
echo "📝 Creating audit wrapper..."
cat > scripts/run-weekly-audit.sh << 'EOF'
#!/bin/bash
# Weekly audit runner with timestamped logging

DATE=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="logs/audit/audit_${DATE}.log"

echo "=== Statpedia Data Pipeline Audit ===" > "$LOG_FILE"
echo "Date: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Run audit
npx tsx scripts/audit-data-pipeline.ts >> "$LOG_FILE" 2>&1

echo "📊 Audit completed at $(date)" >> logs/audit/summary.log

# Keep only last 90 days of logs
find logs/audit -name "audit_*.log" -mtime +90 -delete
EOF

chmod +x scripts/run-weekly-audit.sh

# Test validation script
echo ""
echo "🧪 Running initial validation test..."
npx tsx scripts/validate-data-quality.ts

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Initial validation PASSED!"
  echo ""
  echo "📅 Next steps:"
  echo ""
  echo "1. Set up cron jobs for automated monitoring:"
  echo "   Run: crontab -e"
  echo "   Add these lines:"
  echo ""
  echo "   # Daily validation at 6 AM"
  echo "   0 6 * * * cd $(pwd) && ./scripts/run-daily-validation.sh"
  echo ""
  echo "   # Weekly audit on Sundays at 8 AM"
  echo "   0 8 * * 0 cd $(pwd) && ./scripts/run-weekly-audit.sh"
  echo ""
  echo "2. Monitor validation logs:"
  echo "   tail -f logs/validation/summary.log"
  echo ""
  echo "3. View latest validation:"
  echo "   ls -t logs/validation/ | head -1 | xargs -I {} cat logs/validation/{}"
  echo ""
  echo "4. Run manual validation anytime:"
  echo "   ./scripts/run-daily-validation.sh"
  echo ""
  echo "📚 See ROADMAP.md for complete Phase 1 checklist"
else
  echo ""
  echo "⚠️  Initial validation had warnings. Check output above."
  echo "   Review ROADMAP.md Phase 1 tasks for next steps."
fi

echo ""
echo "✨ Setup complete!"
