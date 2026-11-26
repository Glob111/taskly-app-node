export type FileStatus = 'added' | 'modified' | 'removed' | 'deleted' | 'renamed' | 'copied' | 'changed' | string;
export interface ChangedFile { path: string; status?: FileStatus; previousPath?: string }
export interface Ignored { path: string; reason: string }
export interface Classification {
  frontend: string[];
  backend: string[];
  testsNeeded: boolean;
  sourceFiles: string[];
  ignored: Ignored[];
}

export function normalizePath(p: string): string {
  return String(p ?? '').trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/{2,}/g, '/');
}

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;

export function classifyFile(file: ChangedFile): { kind: 'frontend' | 'backend' | null; path: string; reason?: string } {
  const path = normalizePath(file.path);
  const status = (file.status ?? 'modified').toLowerCase();
  if (!path) return { kind: null, path, reason: 'empty path' };
  if (status === 'removed' || status === 'deleted') return { kind: null, path, reason: 'deleted file' };
  const isBackend = path.startsWith('backend/src/');
  const isFrontend = path.startsWith('frontend/src/');
  if (!isBackend && !isFrontend) return { kind: null, path, reason: 'outside backend/src and frontend/src' };
  if (/\.d\.ts$/.test(path)) return { kind: null, path, reason: 'type declaration' };
  if (/\.(test|spec)\.[a-z]+$/.test(path) || /(^|\/)__tests__\//.test(path)) return { kind: null, path, reason: 'test file' };
  if (isFrontend && path.startsWith('frontend/src/test/')) return { kind: null, path, reason: 'test helper' };
  if (/\.stories\.[a-z]+$/.test(path) || /(^|\/)__stories__\//.test(path)) return { kind: null, path, reason: 'story file' };
  if (!CODE_EXT.test(path)) return { kind: null, path, reason: 'not a code file' };
  return { kind: isBackend ? 'backend' : 'frontend', path };
}

export function classifyDiff(files: ChangedFile[] | null | undefined): Classification {
  const out: Classification = { frontend: [], backend: [], testsNeeded: false, sourceFiles: [], ignored: [] };
  if (!Array.isArray(files)) return out;
  const seen = new Set<string>();
  for (const f of files) {
    const r = classifyFile(typeof f === 'string' ? { path: f } : f);
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    if (!r.kind) { out.ignored.push({ path: r.path, reason: r.reason ?? 'ignored' }); continue; }
    out[r.kind].push(r.path);
    out.sourceFiles.push(r.path);
  }
  out.testsNeeded = out.sourceFiles.length > 0;
  return out;
}
