---
name: analyze-pr-diff
description: Decide which changed files in a PR need new or updated unit tests. Use first, before writing any test.
---

# Analyze PR diff

1. Read `.agent-run/prompt.txt` (fixed rules + untrusted PR data) and `.agent-run/plan.json` (output of the deterministic classifier: `frontend[]`, `backend[]`, `sourceFiles[]`, and `mapping[]` = source → expected test path + whether it exists).
2. For each source file, choose one decision:
   - **create** — no test file exists → create at the mapped path.
   - **update** — test file exists but the change adds/alters behavior (new branch, param, endpoint, prop, hook return) → extend it.
   - **skip** — pure types, re-exports, constants, formatting-only or comment-only changes, generated code. State why.
3. Read the changed source (and the existing test) with Read/Grep. Look at the diff hunks to target changed behavior, not the whole file.
4. Record each decision as one short sentence for `result.json`.

Do not write tests in this skill.
