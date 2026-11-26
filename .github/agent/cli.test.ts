import { main, dryRun, flag } from './cli.ts';

const run = (argv: string[], stdin = '', env: Record<string, string | undefined> = {}) => main(argv, () => stdin, env);

describe('cli', () => {
  it('classify', () => {
    const r = run(['classify'], JSON.stringify([{ path: 'backend/src/a.ts' }]));
    expect(JSON.parse(r.out).backend).toEqual(['backend/src/a.ts']);
  });
  it('classify empty stdin', () => expect(JSON.parse(run(['classify'], '').out).testsNeeded).toBe(false));
  it('guard exit code 2 on violations', () => {
    expect(run(['guard'], JSON.stringify(['backend/src/a.ts'])).code).toBe(2);
    expect(run(['guard'], JSON.stringify(['backend/tests/a.test.ts'])).code).toBe(0);
  });
  it('prompt', () => expect(run(['prompt'], JSON.stringify({ title: 'x' })).out).toMatch(/UNTRUSTED PR TITLE/));
  it('map', () => expect(JSON.parse(run(['map', '--root', '/nonexistent'], JSON.stringify(['backend/src/a.ts'])).out)[0].exists).toBe(false));
  it('comment accepts raw vitest json', () => {
    const out = run(['comment'], JSON.stringify({ results: { backend: { numTotalTests: 1, numPassedTests: 1, numFailedTests: 0 } } })).out;
    expect(out).toMatch(/\| backend \| PASS/);
  });
  it('mode: fork never runs, secret read from env', () => {
    const m = (args: string[], env = {}) => JSON.parse(run(['mode', ...args], '', env).out).mode;
    expect(m(['--event', 'pull_request', '--base', 'o/r', '--head', 'x/r'], { AGENT_API_KEY: 'k' })).toBe('skip-fork');
    expect(m(['--event', 'pull_request', '--base', 'o/r', '--head', 'o/r'], {})).toBe('skip-no-secret');
    expect(m(['--event', 'pull_request', '--base', 'o/r', '--head', 'o/r'], { AGENT_API_KEY: 'k' })).toBe('run');
  });
  it('unknown command', () => expect(run(['nope']).code).toBe(64));
  it('dry-run pipeline works with fixtures, blocks malicious writes', () => {
    const r = dryRun();
    expect(r.markdown).toMatch(/test-agent-report/);
    expect(r.markdown).toMatch(/Blocked changes/);
    expect(r.markdown).toMatch(/\| frontend \| FAIL \| 1 \| 1 \| 2 \|/);
    const g = r.json.guard as { violations: unknown[] };
    expect(g.violations).toHaveLength(2);
    expect((r.json.classification as any).sourceFiles).toHaveLength(4);
  });
  it('flag helper', () => expect(flag(['a', '--x', 'v'], 'x')).toBe('v'));
});
