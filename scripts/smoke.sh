#!/usr/bin/env bash
# Usage: scripts/smoke.sh [base-url]
# Waits up to 30 seconds for /health to return 200, then checks /version and task creation.
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

for attempt in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health" || true)
  if [ "$code" = "200" ]; then
    break
  fi
  if [ "$attempt" = "30" ]; then
    echo "smoke: /health returned $code" >&2
    exit 1
  fi
  sleep 1
done

curl -fsS "$BASE_URL/version" > /dev/null
curl -fsS -X POST "$BASE_URL/tasks" \
  -H 'Content-Type: application/json' \
  -d '{"title":"smoke"}' > /dev/null

echo "smoke: ok"
