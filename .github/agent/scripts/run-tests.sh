#!/usr/bin/env bash
# Run backend + frontend suites with coverage; never fail the step (results are parsed later).
# Writes .agent-run/{backend,frontend}-vitest.json and coverage summaries.
set -uo pipefail
mkdir -p .agent-run
for side in backend frontend; do
  timeout 900 npm --prefix "$side" run test:coverage -- \
    --reporter=default --reporter=json --outputFile.json="$PWD/.agent-run/$side-vitest.json" \
    --coverage.reporter=json-summary --coverage.reporter=text-summary \
    > ".agent-run/$side-run.log" 2>&1
  echo "$side exit code: $?"
  [ -f "$side/coverage/coverage-summary.json" ] && cp "$side/coverage/coverage-summary.json" ".agent-run/$side-coverage.json"
done
exit 0
