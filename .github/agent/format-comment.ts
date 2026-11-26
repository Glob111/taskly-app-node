import type { TestSummary } from './parse-vitest.ts';
import type { Mode } from './check-secret.ts';
import type { Violation } from './path-guard.ts';

export const MARKER = '<!-- test-agent-report -->';
export const MAX_COMMENT = 65536;

export interface Coverage { lines?: number; statements?: number; branches?: number; functions?: number }
export interface ReportInput {
  mode: Mode;
  reason?: string;
  decisions?: string[];
  skills?: string[];
  filesChanged?: string[];
  violations?: Violation[];
  results?: { backend?: TestSummary | null; frontend?: TestSummary | null };
  coverage?: { backend?: Coverage | null; frontend?: Coverage | null };
  runUrl?: string;
}

/** Neutralize markdown/HTML that could spoof the marker, mention users or break layout. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/<!--/g, '&lt;!--')
    .replace(/-->/g, '--&gt;')
    .replace(/</g, '&lt;')
    .replace(/@/g, '@​')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|');
}
const code = (s: string) => '`' + String(s).replace(/`/g, "'").replace(/\r?\n/g, ' ') + '`';
const list = (xs: string[] | undefined, f: (x: string) => string = esc) => (xs?.length ? xs.map((x) => `- ${f(x)}`).join('\n') : '_none_');
const pct = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(1)}%` : 'n/a');

function resultLine(name: string, r?: TestSummary | null): string {
  if (!r) return `| ${name} | not run | - | - | - |`;
  if (!r.valid) return `| ${name} | no parsable results | - | - | - |`;
  return `| ${name} | ${r.failed === 0 ? 'PASS' : 'FAIL'} | ${r.passed} | ${r.failed} | ${r.total} |`;
}

export function formatComment(r: ReportInput, max = MAX_COMMENT): string {
  const out: string[] = [MARKER, '## Unit test agent report', ''];
  if (r.mode === 'skip-no-secret') {
    out.push('> **Skipped:** the API key secret is not configured for this repository, so the agent did not run. No tests were generated.');
  } else if (r.mode === 'skip-fork') {
    out.push('> **Skipped:** this PR comes from a fork (or its origin could not be verified). Secrets are never exposed to fork PRs, so the agent did not run.');
  }
  if (r.mode !== 'run' && r.reason) out.push('', `Reason: ${esc(r.reason)}`);
  if (r.mode === 'run') {
    out.push('### Decisions', list(r.decisions), '', '### Skills used', list(r.skills, (x) => code(x)), '');
    out.push('### Files changed', list(r.filesChanged, (x) => code(x)), '');
    if (r.violations?.length) {
      out.push('### Blocked changes (path guard)', list(r.violations.map((v) => `${v.path}: ${v.reason}`), (x) => esc(x)), '');
    }
    out.push('### Test results', '', '| Suite | Status | Passed | Failed | Total |', '|---|---|---|---|---|');
    out.push(resultLine('backend', r.results?.backend), resultLine('frontend', r.results?.frontend), '');
    for (const [n, s] of [['backend', r.results?.backend], ['frontend', r.results?.frontend]] as const) {
      if (s?.failures?.length) {
        out.push(`<details><summary>${n} failures (${s.failures.length})</summary>`, '');
        for (const f of s.failures.slice(0, 20)) out.push(`- ${code(f.file)} ${esc(f.name)}: ${esc(f.message.slice(0, 300))}`);
        out.push('', '</details>', '');
      }
    }
    const cov = r.coverage;
    if (cov && (cov.backend || cov.frontend)) {
      out.push('### Coverage', '', '| Suite | Lines | Statements | Branches | Functions |', '|---|---|---|---|---|');
      for (const [n, c] of [['backend', cov.backend], ['frontend', cov.frontend]] as const) {
        if (c) out.push(`| ${n} | ${pct(c.lines)} | ${pct(c.statements)} | ${pct(c.branches)} | ${pct(c.functions)} |`);
      }
      out.push('');
    }
  }
  if (r.runUrl && /^https:\/\/[^\s)<>]+$/.test(r.runUrl)) out.push(`[Workflow run](${r.runUrl})`);
  let text = out.join('\n').trimEnd() + '\n';
  if (text.length > max) {
    const note = '\n\n_...report truncated to fit GitHub comment limit..._\n';
    text = text.slice(0, max - note.length) + note;
  }
  return text;
}
