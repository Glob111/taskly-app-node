---
name: verify-tests
description: Run affected backend/frontend tests, interpret failures, fix the agent's own tests (max 3 attempts).
---

# Verify tests

Run only the suites you touched (allowed commands):
- `npm --prefix backend test -- <test files>`
- `npm --prefix frontend test -- <test files>`
Then once per touched side run the whole suite to check for regressions.

On failure:
1. Read the assertion error; decide whether the test or the application code is wrong.
2. Test wrong → fix the test. Application wrong → do NOT edit it; keep the test honest (do not assert buggy behavior), mark it clearly and record it in `decisions`.
3. Max 3 attempts. Never `.skip`/`.only`/delete assertions to get green.

The workflow re-runs everything independently after you finish; your own run is only for iteration.
