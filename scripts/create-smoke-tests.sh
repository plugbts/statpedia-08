#!/usr/bin/env bash
set -euo pipefail

# Smoke test script for StatPedia
# Usage: WORKER_BASE_URL=https://... NEON_DATABASE_URL="postgresql://..." ./scripts/create-smoke-tests.sh
# Optional envs: SUPABASE_URL, SUPABASE_SERVICE_KEY

: "${WORKER_BASE_URL:?WORKER_BASE_URL is required (e.g. https://statpedia-player-props.*.workers.dev)}"
: "${NEON_DATABASE_URL:?NEON_DATABASE_URL is required (psql connection string)}"

echo "=== StatPedia Smoke Tests ==="

# 1) Worker health check
echo "\n1) Worker health check"
HEALTH_URL="${WORKER_BASE_URL%/}/api/health"
if command -v curl >/dev/null 2>&1; then
  if command -v jq >/dev/null 2>&1; then
    curl -sS "$HEALTH_URL" | jq || true
  else
    curl -sS "$HEALTH_URL" || true
  fi
else
  echo "curl is required to run this script"
  exit 2
fi

# 2) Streaks endpoint (NBA sample)
echo "\n2) Streaks endpoint (NBA sample)"
STREAKS_URL="${WORKER_BASE_URL%/}/analytics/streaks?league=NBA&limit=5"
if command -v jq >/dev/null 2>&1; then
  curl -sS "$STREAKS_URL" | jq || true
else
  curl -sS "$STREAKS_URL" || true
fi

# 3) Optional: run mock-data generator if available
if [ -f "./create-mock-streaks-data.js" ] && command -v node >/dev/null 2>&1; then
  echo "\n3) Running create-mock-streaks-data.js to insert mock game logs and retest streaks"
  node create-mock-streaks-data.js || true
  echo "Re-querying streaks endpoint after mock insert:"
  if command -v jq >/dev/null 2>&1; then
    curl -sS "${WORKER_BASE_URL%/}/analytics/streaks?league=NBA&limit=5" | jq || true
  else
    curl -sS "${WORKER_BASE_URL%/}/analytics/streaks?league=NBA&limit=5" || true
  fi
else
  echo "\n3) Skipping mock-data generator (create-mock-streaks-data.js not found or node missing)"
fi

# 4) Database checks for teams and team_abbrev_map
if command -v psql >/dev/null 2>&1; then
  echo "\n4) DB check: teams (sample)"
  psql "$NEON_DATABASE_URL" -c "select league, abbreviation, team_name, logo_url from teams order by league, abbreviation limit 20;"

  echo "\n4b) DB check: team_abbrev_map (sample)"
  psql "$NEON_DATABASE_URL" -c "select league, api_abbrev, team_id from team_abbrev_map limit 20;"
else
  echo "\npsql not found - cannot query database. Skipping DB checks."
fi

echo "\nSmoke tests completed. Review output above for errors or missing data."
