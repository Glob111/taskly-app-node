import { normalizePath } from './classify-diff.ts';

export interface TestMapping { source: string; testPath: string; exists: boolean; candidates: string[] }
export type ExistsFn = (path: string) => boolean;

export function mapTest(source: string, exists: ExistsFn = () => false): TestMapping | null {
  const p = normalizePath(source);
  const m = /^(.*\/)?([^/]+)\.(ts|tsx|js|jsx|mjs|mts)$/.exec(p);
  if (!m) return null;
  const [, dir = '', name, ext] = m;
  let candidates: string[];
  let primary: string;
  if (p.startsWith('backend/src/')) {
    primary = `backend/tests/${name}.test.ts`;
    candidates = [primary];
  } else if (p.startsWith('frontend/src/')) {
    const jsx = ext === 'tsx' || ext === 'jsx';
    primary = `${dir}${name}.test.${jsx ? 'tsx' : 'ts'}`;
    candidates = [primary, `${dir}${name}.test.${jsx ? 'ts' : 'tsx'}`];
  } else return null;
  const found = candidates.find((c) => exists(c));
  return { source: p, testPath: found ?? primary, exists: Boolean(found), candidates };
}

export function mapTests(sources: string[], exists: ExistsFn = () => false): TestMapping[] {
  return (sources ?? []).map((s) => mapTest(s, exists)).filter((x): x is TestMapping => x !== null);
}
