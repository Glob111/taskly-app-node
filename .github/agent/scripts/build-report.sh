#!/usr/bin/env bash
# Assemble report.json and render the markdown comment (.agent-run/comment.md).
# env: MODE, REASON, RUN_URL, TRUSTED
set -euo pipefail
mkdir -p .agent-run
j() { [ -s "$1" ] && cat "$1" || echo "${2:-null}"; }

# Agent output is untrusted: keep only bounded arrays of strings.
AGENT=$(j .agent-run/result.json '{}' | jq -c '{decisions: ((.decisions // []) | map(tostring | .[0:300]) | .[0:20]),
                                               skills:    ((.skills // [])    | map(tostring | .[0:60])  | .[0:10])}' 2>/dev/null || echo '{"decisions":[],"skills":[]}')

cov() { j ".agent-run/$1-coverage.json" 'null' | jq -c '.total // null | if . then {lines: .lines.pct, statements: .statements.pct, branches: .branches.pct, functions: .functions.pct} else null end' 2>/dev/null || echo null; }

jq -n -c \
  --arg mode "${MODE:?}" --arg reason "${REASON:-}" --arg runUrl "${RUN_URL:-}" \
  --argjson agent "$AGENT" \
  --argjson guard "$(j .agent-run/guard.json '{"allowed":[],"violations":[]}')" \
  --argjson be "$(j .agent-run/backend-vitest.json null)" --argjson fe "$(j .agent-run/frontend-vitest.json null)" \
  --argjson cbe "$(cov backend)" --argjson cfe "$(cov frontend)" '
  { mode: $mode, reason: $reason, runUrl: $runUrl,
    decisions: $agent.decisions, skills: $agent.skills,
    filesChanged: $guard.allowed, violations: $guard.violations,
    results: (if $be == null and $fe == null then null else {backend: $be, frontend: $fe} end),
    coverage: {backend: $cbe, frontend: $cfe} }' > .agent-run/report.json

node "$TRUSTED/.github/agent/cli.ts" comment --input .agent-run/report.json > .agent-run/comment.md
