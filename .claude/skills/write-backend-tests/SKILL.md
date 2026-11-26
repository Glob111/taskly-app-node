---
name: write-backend-tests
description: Write or update backend unit tests (vitest) in backend/tests for changed backend/src files.
---

# Write backend tests

Conventions (verify by reading `backend/tests/fixture.ts` and a sibling test first):
- One test file per source module: `backend/src/<path>/x.ts` → `backend/tests/x.test.ts`. ESM, relative imports with `.js` suffix, `import { describe, it, expect, vi } from 'vitest'`.
- No real database or network. Mock Prisma/pg with `vi.mock`; router tests use `supertest` against `createApp`-style apps with a mocked repository. Reuse `fixture.ts` records.
- Env: `vi.stubEnv` + `vi.unstubAllEnvs()` in `afterEach`; restore mocks and timers.
- Cover: happy path, validation errors (422), not-found (404), boundary values, error propagation. Assert behavior, not implementation details.
- Per-file coverage thresholds exist for `validators.ts` and `mappers.ts` (100%): changes there need full branch coverage.
- Deterministic: no wall-clock/random dependence; use fake timers.
- Only write under `backend/tests/`.
