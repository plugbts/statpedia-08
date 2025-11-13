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
