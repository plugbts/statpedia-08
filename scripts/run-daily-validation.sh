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
