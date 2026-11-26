import { classifyDiff } from './classify-diff.ts';

describe('classifyDiff', () => {
  it('handles empty/invalid input', () => {
    for (const v of [[], null, undefined]) {
      expect(classifyDiff(v as never)).toEqual({ frontend: [], backend: [], testsNeeded: false, sourceFiles: [], ignored: [] });
    }
  });
  it('splits frontend and backend source', () => {
    const r = classifyDiff([
      { path: 'backend/src/a/b.ts', status: 'modified' },
      { path: 'frontend/src/c/D.tsx', status: 'added' },
    ]);
    expect(r.backend).toEqual(['backend/src/a/b.ts']);
    expect(r.frontend).toEqual(['frontend/src/c/D.tsx']);
    expect(r.testsNeeded).toBe(true);
    expect(r.sourceFiles).toHaveLength(2);
  });
  it('ignores docs, locks, configs, workflows, stories, tests, d.ts, helpers', () => {
    const paths = ['README.md', 'backend/package-lock.json', 'frontend/vite.config.ts', '.github/workflows/x.yml',
      'frontend/src/A.stories.tsx', 'frontend/src/A.test.tsx', 'backend/tests/x.test.ts', 'frontend/src/vite-env.d.ts',
      'frontend/src/test/setup.ts', 'frontend/src/styles.css', 'backend/src/x.spec.ts', 'backend/src/data.json'];
    const r = classifyDiff(paths.map((path) => ({ path })));
    expect(r.sourceFiles).toEqual([]);
    expect(r.testsNeeded).toBe(false);
    expect(r.ignored).toHaveLength(paths.length);
  });
  it('ignores deleted, uses new path for renames', () => {
    const r = classifyDiff([
      { path: 'backend/src/gone.ts', status: 'removed' },
      { path: 'backend/src/new.ts', status: 'renamed', previousPath: 'backend/src/old.ts' },
    ]);
    expect(r.backend).toEqual(['backend/src/new.ts']);
    expect(r.ignored[0].reason).toMatch(/deleted/);
  });
  it('normalizes Windows paths and dedupes', () => {
    const r = classifyDiff([{ path: 'frontend\\src\\hooks\\useX.ts' }, { path: './frontend/src/hooks/useX.ts' }]);
    expect(r.frontend).toEqual(['frontend/src/hooks/useX.ts']);
  });
  it('does not misclassify lookalike prefixes', () => {
    const r = classifyDiff([{ path: 'backend/srcx/a.ts' }, { path: 'xfrontend/src/a.ts' }, { path: '' }]);
    expect(r.sourceFiles).toEqual([]);
  });
});
