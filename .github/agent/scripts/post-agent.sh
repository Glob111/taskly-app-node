#!/usr/bin/env bash
# Compare the working tree with the pre-agent snapshot, run the path guard on every
# file the agent touched, revert anything not allowed, and write .agent-run/guard.json.
# Usage: post-agent.sh <PRE_TREE_SHA>      env: TRUSTED (dir holding trusted .github/agent)
set -euo pipefail
PRE="${1:?pre-agent tree sha required}"
mkdir -p .agent-run

git add -A -- . >/dev/null
POST="$(git write-tree)"
git reset -q

# status<TAB>path for every change the agent made (renames are reported as delete+add)
git diff-tree -r --no-renames --name-status "$PRE" "$POST" > .agent-run/changes.tsv || true

jq -R -s '[split("\n")[] | select(length>0) | split("\t") | {status: .[0], path: .[1]}]' \
  .agent-run/changes.tsv > .agent-run/changes.json

# Guard everything that is not a deletion; deletions are always rejected.
jq '[.[] | select(.status != "D") | .path]' .agent-run/changes.json | \
  node "$TRUSTED/.github/agent/cli.ts" guard > .agent-run/guard-raw.json || true  # exit 2 == violations

jq -n --slurpfile raw .agent-run/guard-raw.json --slurpfile ch .agent-run/changes.json '
  ($raw[0] // {allowed: [], violations: []}) as $g
  | { allowed: $g.allowed,
      violations: ($g.violations + [$ch[0][] | select(.status == "D") | {path, reason: "deleting files is not allowed"}]) }
' > .agent-run/guard.json

# Revert every violating path to its pre-agent state.
jq -r '.violations[].path' .agent-run/guard.json | while IFS= read -r p; do
  [ -z "$p" ] && continue
  case "$p" in /*|*..*) echo "refusing to touch suspicious path: $p" >&2; continue ;; esac
  if git cat-file -e "$PRE:$p" 2>/dev/null; then
    git --work-tree=. checkout "$PRE" -- "$p" && git reset -q -- "$p"
  else
    rm -rf -- "$p"
  fi
done
echo "allowed: $(jq '.allowed|length' .agent-run/guard.json), blocked: $(jq '.violations|length' .agent-run/guard.json)"
