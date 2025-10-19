#!/bin/bash
# Run analytics health check SQL and print summary
set -e

DB_URL=${NEON_DATABASE_URL:-$DATABASE_URL}
if [ -z "$DB_URL" ]; then
  echo "DATABASE_URL/NEON_DATABASE_URL not set" >&2
  exit 1
fi

psql "$DB_URL" -f scripts/analytics-health-check.sql
