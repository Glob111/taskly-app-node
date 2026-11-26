# Test agent: progress log (part A)
Run tests offline: `cd backend && npx --no-install vitest run --root ../.github/agent`
Run CLI: `node .github/agent/cli.ts <classify|map|guard|prompt|comment|mode|dry-run>` (Node >= 22.18, erasable TS only)
- [ ] classify-diff
- [x] classify-diff, map-tests (tests green)
- [x] path-guard, build-prompt
- [x] parse-vitest, check-secret
- [x] format-comment
- [x] cli.ts + fixtures; all 79 tests green. DONE.
