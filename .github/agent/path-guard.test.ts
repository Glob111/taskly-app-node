import { guardPaths, checkPath } from './path-guard.ts';

describe('guardPaths', () => {
  it('allows test files', () => {
    const r = guardPaths(['backend/tests/a.test.ts', 'backend/tests/sub/fixture.ts', 'frontend/src/x/A.test.tsx', 'frontend/src/a.test.ts', 'frontend/src/test/setup.ts']);
    expect(r.ok).toBe(true);
    expect(r.allowed).toHaveLength(5);
  });
  it('empty input is ok', () => {
    expect(guardPaths([])).toEqual({ ok: true, allowed: [], violations: [] });
    expect(guardPaths(undefined)).toMatchObject({ ok: true });
  });
  it.each([
    'backend/src/a.ts', 'frontend/src/A.tsx', 'package.json', 'backend/package.json', 'backend/package-lock.json',
    '.github/workflows/x.yml', '.claude/settings.json', '.github/agent/cli.ts', 'backend/tests/../src/a.ts',
    'backend/tests/../../.github/x.ts', '/etc/passwd', 'C:\\x\\a.test.ts', 'C:/x/a.test.ts', '~/a.test.ts',
    'backend/tests/%2e%2e/src/a.ts', 'backend/tests/a.test.ts\0.png', 'backend/tests//a.ts', 'backend/tests/./a.ts',
    'backend/tests/a.json', 'backend/tests/node_modules/x.ts', 'Backend/tests/a.ts', 'backend/tests/.git/hooks.ts',
    'frontend/src/A.tsx.test.md', 'backend/tests/a.ts ', 'backend/tests/a.ts.', '..\\backend\\tests\\a.ts', 'frontend/src/testing/a.ts',
  ])('rejects %j', (p) => {
    const r = guardPaths([p]);
    expect(r.ok).toBe(false);
    expect(r.violations[0].path).toBe(p);
  });
  it('accepts windows-style separators for allowed files', () => {
    expect(guardPaths(['backend\\tests\\a.test.ts']).allowed).toEqual(['backend/tests/a.test.ts']);
  });
  it('rejects symlinks via callback and non-strings', () => {
    expect(checkPath('backend/tests/a.test.ts', { isSymlink: () => true })).toBe('symlink');
    expect(guardPaths([null as never, 5 as never]).violations).toHaveLength(2);
  });
  it('reports mixed results', () => {
    const r = guardPaths(['backend/tests/a.test.ts', 'backend/src/a.ts']);
    expect(r.allowed).toEqual(['backend/tests/a.test.ts']);
    expect(r.violations).toHaveLength(1);
  });
});
