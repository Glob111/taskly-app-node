# SOLUTION: Unit Test Agent and Agentic PR Workflow

A GitHub Actions workflow that, for every pull request, analyses the diff, lets a custom Claude Code agent
(with reusable skills) create or update unit tests for the changed frontend/backend code, **verifies them by
running the suites**, and reports the result as a PR comment (updated in place) and job summary.

## 1. Main technical decisions

| Decision | Rationale |
|---|---|
| **Agent environment: Claude Code** via `anthropics/claude-code-action` | Native support for custom subagents (`.claude/agents`) and skills (`.claude/skills`), tool allowlists, runs inside GitHub Actions. |
| **Deterministic logic lives in tested TypeScript (`.github/agent/`), not in YAML or the prompt** | Diff classification, test-path mapping, path guard, secret/fork gating, prompt building, vitest parsing and comment rendering are all unit-tested (81 tests) and run without an API key or LLM. Only "write the test" is non-deterministic. |
| **The LLM is not trusted; a deterministic guard is** | The agent is told to write only tests, but after it finishes `post-agent.sh` diffs the tree against a pre-agent snapshot, runs the path guard and **reverts** anything outside the test allowlist (source, `package.json`, workflows, `.claude`, deletions). |
| **Tests are verified independently** | After the agent, the workflow runs the full backend and frontend suites with coverage in a step that has no secrets. Results come from vitest JSON, not from the agent's claims. |
| **Commit only when green** | Generated tests are pushed to the PR branch only if both suites pass and the PR is from the same repository. Otherwise nothing is committed and the comment says why. |
| **Trusted tooling from the base branch** | Agent definition, skills and scripts are loaded from the PR's *base* commit, so a PR cannot rewrite the rules that govern the agent reviewing it. |
| **Fork PRs / missing secret fail closed** | `pull_request` (not `pull_request_target`); fork PRs and runs without either secret produce a clear "skipped" report instead of failing or exposing secrets. |
| **Untrusted input handling** | PR title/body/diff are wrapped in nonce-delimited `UNTRUSTED` blocks with lookalike delimiters neutralised; they are passed through env vars and files, never interpolated into shell. Agent output is length-bounded and escaped (no `@` mentions, no marker spoofing) before rendering. |

## 2. How to run the PR workflow, prerequisites

1. Push this repository to GitHub (public) and make sure the agent files are on the **default branch**
   (tooling is read from the PR's base branch, so the very first PR that adds it is skipped with an explanatory comment).
2. Add ONE repository secret (Settings > Secrets and variables > Actions): **`ANTHROPIC_API_KEY`** (API billing) or **`CLAUDE_CODE_OAUTH_TOKEN`** (Claude subscription; create it with `claude setup-token`).
3. Settings > Actions > General > Workflow permissions: allow **read and write** (needed to push tests and comment).
   If the default branch is protected, allow `github-actions[bot]` to push to PR branches (feature branches are usually fine).
4. Open a PR from a branch **in the same repository** that changes `backend/src/**` or `frontend/src/**`.
   Workflow: `.github/workflows/test-agent.yml`. (`ci.yml` additionally runs the existing suites and the agent tooling tests.)

Local checks, with no secrets, no network and no LLM:

```sh
npm --prefix backend ci && npm --prefix frontend ci
(cd backend && npx --no-install vitest run --root ../.github/agent)   # 81 tests of the agent tooling
node .github/agent/cli.ts --dry-run                                  # whole pipeline with a mock agent (Node >= 22.18)
npm --prefix backend run test:coverage && npm --prefix frontend run test:coverage
```

`--dry-run` replays a fixture in which the "agent" also tries to edit `backend/src/...` and
`.github/workflows/evil.yml`; both are blocked and shown in the rendered comment.

## 3. Where the agent and skills are defined, and how they are used

| Piece | Location | Role |
|---|---|---|
| Custom agent | `.claude/agents/test-agent.md` | Security rules, 3-step workflow, required `result.json` output. |
| Skill `analyze-pr-diff` | `.claude/skills/analyze-pr-diff/SKILL.md` | Per file: create / update / skip, with reasons. |
| Skill `write-backend-tests` | `.claude/skills/write-backend-tests/SKILL.md` | vitest + supertest conventions, mocking, env handling. |
| Skill `write-frontend-tests` | `.claude/skills/write-frontend-tests/SKILL.md` | Testing Library, hooks, http mocking conventions. |
| Skill `verify-tests` | `.claude/skills/verify-tests/SKILL.md` | Run affected tests, max 3 fix attempts, no weakening assertions. |
| Deterministic tooling | `.github/agent/*.ts`, `cli.ts` | classify, map, guard, prompt, mode, comment. |
| Glue scripts | `.github/agent/scripts/*.sh` | `post-agent.sh` (guard + revert), `run-tests.sh`, `build-report.sh`. |
| Workflow | `.github/workflows/test-agent.yml` | Orchestration. |

Execution order: tooling from base > **mode** (run/skip-fork/skip-no-secret) > **classify** changed files via the GitHub API >
**map** source to expected test files > install > **build prompt** > **agent** (skills in order: analyze, write, verify) >
**path guard + revert** > **independent test run + coverage** > **report** > **commit if green** > comment + summary + artifacts.
The agent's Bash access is limited to `npm --prefix backend|frontend test`, and its writes to test paths via `--allowedTools`.

## 4. Example run

> **Status:** the tooling was verified locally (below). A live run against GitHub requires a secret and a pushed repository,
> so the example PR run is for the reviewer/author to produce; paste the PR link here once done.

Verified locally, offline, without an API key:

- Existing code coverage after adding tests (agent-independent, written during development):
  backend 48 > **97 tests**, lines 33% > **100%**; frontend 47% > **97.4%** lines, 80 tests, `tsc` clean.
- `post-agent.sh` simulation (also an automated test): the agent adds `backend/tests/new.test.ts`, edits `backend/src/a.ts` and
  `.github/workflows/w.yml`, deletes `backend/tests/old.test.ts` > **1 allowed, 3 blocked and reverted**; the comment lists all four.
- `mode` decisions: no key > `skip-no-secret`; fork head > `skip-fork`; same repo + key > `run`.

Expected shape of the PR comment for the demo PR (e.g. a new `GET /todos/stats` endpoint plus a `TodoStats` component):

```
## Unit test agent report
### Decisions
- backend/src/features/todos/router.ts: update (new /stats route) > extended tests
- frontend/src/features/todos/components/TodoStats.tsx: create > new colocated test
### Skills used: analyze-pr-diff, write-backend-tests, write-frontend-tests, verify-tests
### Files changed: backend/tests/router.test.ts, frontend/src/.../TodoStats.test.tsx
### Test results: backend PASS x/x, frontend PASS y/y, coverage table
```

(This block illustrates the format; real numbers come from the workflow run.)

## 5. Assumptions

- Node 22.18+ (CI uses 24); the repo layout (`backend/tests/<name>.test.ts`, colocated frontend tests) stays as is.
- Backend unit tests mock the database (true for the current suite), so CI needs no Postgres.
- PRs come from branches in the same repository; maintainers add `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`.
- `claude-code-action@v1` inputs (`anthropic_api_key`, `prompt`, `claude_args`) match its current documentation.

## 6. Limitations

- **Not verified end-to-end on GitHub from this environment** (no secret, no remote): the LLM step, action inputs and push permissions
  need a first live run. Everything around the LLM is tested locally.
- Quality of generated tests depends on the model; coverage is reported but not gated, and no mutation testing is done.
- Fork PRs get no agent run (by design). Pushes by `GITHUB_TOKEN` do not trigger further workflows, so the newly pushed commit is not re-checked by `ci.yml` until the next push.
- `map-tests` assumes the flat `backend/tests/<basename>.test.ts` convention (same basenames in different folders collide).
- The prompt-injection neutraliser is heuristic; the real protections are the path guard, secret scoping and tool allowlist.
- The bootstrap PR that introduces the tooling is skipped (tooling is loaded from base).
- `claude-code-action@v1` is a floating tag.

## 7. What I would change for production

- Pin all actions to commit SHAs; add Dependabot for them.
- Run the agent on `workflow_run` / a dedicated runner with network egress allowlist; run generated tests in a sandbox/container.
- Support fork PRs safely via a two-stage flow (untrusted artifact > trusted job) or maintainer-approved label.
- Gate on coverage deltas for changed lines; add mutation testing (Stryker) to judge test quality; flake detection (re-run twice).
- Cost controls: per-PR token/turn budget, skip on large diffs, cache `node_modules`.
- Commit to a separate bot PR/branch instead of pushing to author branches; require human review of generated tests.
- Telemetry on agent decisions and pass rates; an eval suite of fixed diffs with expected outcomes for the skills.
