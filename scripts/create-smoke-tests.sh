#!/usr/bin/env bash
set -euo pipefail

# Extended smoke test script for StatPedia
# Usage: WORKER_BASE_URL=https://... NEON_DATABASE_URL="postgresql://..." ./scripts/create-smoke-tests.sh
# Optional envs: SUPABASE_URL, SUPABASE_SERVICE_KEY

: "${WORKER_BASE_URL:?WORKER_BASE_URL is required (e.g. https://statpedia-player-props.*.workers.dev)}"
: "${NEON_DATABASE_URL:?NEON_DATABASE_URL is required (psql connection string)}"

echo "=== StatPedia Smoke Tests ==="

# Helper to curl with optional jq
function pretty_curl() {
  local url="$1"
  if command -v jq >/dev/null 2>&1; then
    curl -sS "$url" | jq || true
  else
    curl -sS "$url" || true
  fi
}

# 1) Worker health check
echo "\n1) Worker health check"
HEALTH_URL="${WORKER_BASE_URL%/}/api/health"
if command -v curl >/dev/null 2>&1; then
  pretty_curl "$HEALTH_URL"
else
  echo "curl is required to run this script"
  exit 2
fi

# 2) Streaks endpoint (sample for multiple leagues)
echo "\n2) Streaks endpoint (sample for NBA/NFL)"
for league in NBA NFL MLB NHL; do
  echo "-- Querying streaks for: $league"
  STREAKS_URL="${WORKER_BASE_URL%/}/analytics/streaks?league=${league}&limit=5"
  pretty_curl "$STREAKS_URL"
done

# 3) Props list endpoint sample checks
echo "\n3) Props list endpoint checks"
PROPS_URL="${WORKER_BASE_URL%/}/api/props-list?league=NBA&limit=5"
pretty_curl "$PROPS_URL"

# 4) Optional: run mock-data generator if available
if [ -f "./create-mock-streaks-data.js" ] && command -v node >/dev/null 2>&1; then
  echo "\n4) Running create-mock-streaks-data.js to insert mock game logs and retest streaks"
  node create-mock-streaks-data.js || true
  echo "Re-querying streaks endpoint after mock insert:"
  pretty_curl "${WORKER_BASE_URL%/}/analytics/streaks?league=NBA&limit=5"
else
  echo "\n4) Skipping mock-data generator (create-mock-streaks-data.js not found or node missing)"
fi

# 5) DB checks for teams, team_abbrev_map, proplines, player_game_logs
if command -v psql >/dev/null 2>&1; then
  echo "\n5) DB check: teams (sample)"
  psql "$NEON_DATABASE_URL" -c "select league, abbreviation, team_name, logo_url from teams order by league, abbreviation limit 20;"

  echo "\n5b) DB check: team_abbrev_map (sample)"
  psql "$NEON_DATABASE_URL" -c "select league, api_abbrev, team_id from team_abbrev_map limit 20;"

  echo "\n5c) DB check: proplines counts (sample)"
  psql "$NEON_DATABASE_URL" -c "select league, count(*) as total from proplines group by league order by league;" || true

  echo "\n5d) DB check: player_game_logs counts (sample)"
  psql "$NEON_DATABASE_URL" -c "select league, count(*) from player_game_logs group by league order by league;" || true
else
  echo "\npsql not found - cannot query database. Skipping DB checks."
fi

# 6) Optional: diagnostic endpoints on worker (if exposed)
echo "\n6) Diagnostic endpoints (worker)"
for path in /api/diagnostic/persist-props /api/diagnostic/status /api/diagnostic/run; do
  url="${WORKER_BASE_URL%/}${path}"
  echo "-- Hitting $url"
  if [[ "$path" == "/api/diagnostic/persist-props" || "$path" == "/api/diagnostic/run" ]]; then
    curl -sS -X POST "$url" || true
  else
    curl -sS "$url" || true
  fi
done

echo "\nSmoke tests completed. Review output above for errors or missing data."
