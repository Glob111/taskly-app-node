import { mapTest, mapTests } from './map-tests.ts';

describe('mapTest', () => {
  it('backend flattens to backend/tests', () => {
    expect(mapTest('backend/src/todos/mappers.ts')).toEqual({
      source: 'backend/src/todos/mappers.ts', testPath: 'backend/tests/mappers.test.ts', exists: false, candidates: ['backend/tests/mappers.test.ts'],
    });
  });
  it('frontend colocates, tsx->tsx, ts->ts', () => {
    expect(mapTest('frontend/src/components/A.tsx')?.testPath).toBe('frontend/src/components/A.test.tsx');
    expect(mapTest('frontend/src/hooks/useA.ts')?.testPath).toBe('frontend/src/hooks/useA.test.ts');
  });
  it('reports existence, incl. alternate extension', () => {
    const r = mapTest('frontend/src/hooks/useA.ts', (p) => p === 'frontend/src/hooks/useA.test.tsx');
    expect(r).toMatchObject({ exists: true, testPath: 'frontend/src/hooks/useA.test.tsx' });
    expect(mapTest('backend/src/x.ts', () => true)?.exists).toBe(true);
  });
  it('handles windows paths, unknown and invalid', () => {
    expect(mapTest('frontend\\src\\App.tsx')?.testPath).toBe('frontend/src/App.test.tsx');
    expect(mapTest('README.md')).toBeNull();
    expect(mapTest('other/src/a.ts')).toBeNull();
    expect(mapTests(undefined as never)).toEqual([]);
  });
});
