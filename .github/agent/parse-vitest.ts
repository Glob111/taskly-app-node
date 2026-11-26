export interface Failure { file: string; name: string; message: string }
export interface TestSummary { passed: number; failed: number; total: number; failures: Failure[]; valid: boolean }

const EMPTY = (): TestSummary => ({ passed: 0, failed: 0, total: 0, failures: [], valid: false });

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return undefined; }
}

export function parseVitest(input: unknown): TestSummary {
  let data: any = input;
  if (typeof input === 'string') {
    data = tryParse(input);
    if (data === undefined) {
      const a = input.indexOf('{'), b = input.lastIndexOf('}');
      data = a >= 0 && b > a ? tryParse(input.slice(a, b + 1)) : undefined;
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return EMPTY();
  const results = Array.isArray(data.testResults) ? data.testResults : [];
  const failures: Failure[] = [];
  let passed = 0, failed = 0, total = 0;
  for (const f of results) {
    const file = String(f?.name ?? '');
    const asserts = Array.isArray(f?.assertionResults) ? f.assertionResults : [];
    for (const a of asserts) {
      total++;
      if (a?.status === 'passed') passed++;
      else if (a?.status === 'failed') {
        failed++;
        const msgs = Array.isArray(a.failureMessages) ? a.failureMessages.join('\n') : '';
        failures.push({ file, name: String(a.fullName ?? a.title ?? ''), message: msgs.slice(0, 2000) });
      }
    }
    if (f?.status === 'failed' && asserts.every((a: any) => a?.status !== 'failed')) {
      // suite-level failure (e.g. import error)
      failed++; total++;
      failures.push({ file, name: '(suite failed to run)', message: String(f.message ?? '').slice(0, 2000) });
    }
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  if (total === 0) {
    // fall back to top-level counters
    passed = num(data.numPassedTests) ?? 0;
    failed = num(data.numFailedTests) ?? 0;
    total = num(data.numTotalTests) ?? passed + failed;
  }
  const valid = results.length > 0 || num(data.numTotalTests) !== undefined;
  return { passed, failed, total, failures, valid };
}
