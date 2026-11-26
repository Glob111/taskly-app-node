---
name: write-frontend-tests
description: Write or update frontend unit tests (vitest + React Testing Library) colocated with changed frontend/src files.
---

# Write frontend tests

Conventions (read `frontend/src/test/setup.ts`, `todoFixture.ts`, `queryWrapper.tsx` and a sibling test first):
- Colocate: `X.tsx` → `X.test.tsx`, `x.ts` → `x.test.ts`.
- Components: Testing Library, query by role/label/text (not class names), interact with `userEvent`; wrap in the theme/QueryClient providers as sibling tests do.
- Hooks: `renderHook` with `test/queryWrapper.tsx`.
- API/http: mock `fetch`/`lib/http`; cover success, 204, network failure, 422/detail errors.
- Fake timers must be restored; no real network; no snapshot tests of large trees.
- Skip stories (`*.stories.tsx`) and type-only files.
- Only write `frontend/src/**/*.test.ts(x)` and `frontend/src/test/**`.
