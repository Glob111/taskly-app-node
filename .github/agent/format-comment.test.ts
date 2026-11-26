import { formatComment, MARKER, esc } from './format-comment.ts';

const ok = { passed: 3, failed: 0, total: 3, failures: [], valid: true };
const bad = { passed: 1, failed: 1, total: 2, valid: true, failures: [{ file: 'a.test.ts', name: 'x', message: 'boom' }] };

describe('formatComment', () => {
  it('contains marker first', () => {
    expect(formatComment({ mode: 'run' }).startsWith(MARKER)).toBe(true);
  });
  it('full run report', () => {
    const t = formatComment({
      mode: 'run', decisions: ['Test mapper'], skills: ['vitest'], filesChanged: ['backend/tests/a.test.ts'],
      results: { backend: ok, frontend: bad }, coverage: { backend: { lines: 91.234 } }, runUrl: 'https://github.com/o/r/actions/runs/1',
    });
    expect(t).toMatch(/\| backend \| PASS \| 3 \| 0 \| 3 \|/);
    expect(t).toMatch(/\| frontend \| FAIL/);
    expect(t).toMatch(/91\.2%/);
    expect(t).toMatch(/failures \(1\)/);
    expect(t).toMatch(/Workflow run/);
  });
  it('skip notes', () => {
    expect(formatComment({ mode: 'skip-no-secret' })).toMatch(/secret is not configured/);
    expect(formatComment({ mode: 'skip-fork' })).toMatch(/fork/);
    expect(formatComment({ mode: 'skip-fork' })).not.toMatch(/Test results/);
  });
  it('handles missing results and invalid parse', () => {
    expect(formatComment({ mode: 'run' })).toMatch(/not run/);
    expect(formatComment({ mode: 'run', results: { backend: { passed: 0, failed: 0, total: 0, failures: [], valid: false } } })).toMatch(/no parsable/);
  });
  it('cannot spoof the marker or mention users', () => {
    const t = formatComment({ mode: 'run', decisions: ['<!-- test-agent-report --> @bob'] });
    expect(t.split(MARKER)).toHaveLength(2);
    expect(t).not.toMatch(/@bob/);
    expect(esc('a|b\nc')).toBe('a\\|b c');
  });
  it('rejects non-https run url', () => {
    expect(formatComment({ mode: 'run', runUrl: 'javascript:alert(1)' })).not.toMatch(/javascript/);
  });
  it('truncates to limit', () => {
    const t = formatComment({ mode: 'run', decisions: Array(20000).fill('decision decision') });
    expect(t.length).toBeLessThanOrEqual(65536);
    expect(t).toMatch(/truncated/);
    expect(t.startsWith(MARKER)).toBe(true);
  });
  it('reports guard violations', () => {
    expect(formatComment({ mode: 'run', violations: [{ path: 'backend/src/a.ts', reason: 'not in test-file allowlist' }] })).toMatch(/Blocked changes/);
  });
});
