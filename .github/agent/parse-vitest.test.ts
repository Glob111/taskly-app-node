import { parseVitest } from './parse-vitest.ts';

const sample = {
  numTotalTests: 3, numPassedTests: 2, numFailedTests: 1,
  testResults: [{ name: '/x/a.test.ts', status: 'failed', assertionResults: [
    { fullName: 'a ok', status: 'passed', failureMessages: [] },
    { fullName: 'a ok2', status: 'passed' },
    { fullName: 'a bad', status: 'failed', failureMessages: ['expected 1 to be 2'] },
  ] }],
};

describe('parseVitest', () => {
  it('parses object and string', () => {
    for (const i of [sample, JSON.stringify(sample)]) {
      const r = parseVitest(i);
      expect(r).toMatchObject({ passed: 2, failed: 1, total: 3, valid: true });
      expect(r.failures).toEqual([{ file: '/x/a.test.ts', name: 'a bad', message: 'expected 1 to be 2' }]);
    }
  });
  it('tolerates leading/trailing log noise', () => {
    expect(parseVitest('stdout noise\n' + JSON.stringify(sample) + '\ndone').total).toBe(3);
  });
  it('tolerates garbage', () => {
    for (const g of ['', 'not json', '{broken', '[]', null, undefined, 42, '{}', '{"testResults":"x"}']) {
      const r = parseVitest(g);
      expect(r).toMatchObject({ passed: 0, failed: 0, total: 0, failures: [] });
      expect(r.valid).toBe(false);
    }
  });
  it('counts suite-level failures', () => {
    const r = parseVitest({ testResults: [{ name: 'b.test.ts', status: 'failed', message: 'Cannot find module', assertionResults: [] }] });
    expect(r).toMatchObject({ failed: 1, total: 1 });
    expect(r.failures[0].message).toMatch(/Cannot find/);
  });
  it('falls back to top-level counters', () => {
    expect(parseVitest({ numTotalTests: 4, numPassedTests: 4, numFailedTests: 0 })).toMatchObject({ total: 4, passed: 4, valid: true });
  });
});
