import { normalizePath } from './classify-diff.ts';

export interface Violation { path: string; reason: string }
export interface GuardResult { ok: boolean; allowed: string[]; violations: Violation[] }
export interface GuardOptions { isSymlink?: (path: string) => boolean }

const ALLOWED: RegExp[] = [
  /^backend\/tests\/(?:[^/]+\/)*[^/]+\.(?:ts|tsx)$/,
  /^frontend\/src\/(?:[^/]+\/)*[^/]+\.test\.tsx?$/,
  /^frontend\/src\/test\/(?:[^/]+\/)*[^/]+\.(?:ts|tsx)$/,
];

export function checkPath(raw: string, opts: GuardOptions = {}): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return 'empty or non-string path';
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(raw)) return 'control character in path';
  if (raw !== raw.trim()) return 'leading/trailing whitespace';
  if (/%[0-9a-f]{2}/i.test(raw)) return 'percent-encoding not allowed';
  const p = raw.replace(/\\/g, '/');
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p) || p.startsWith('~')) return 'absolute path';
  const segs = p.split('/');
  if (segs.some((s) => s === '..')) return 'path traversal';
  if (segs.some((s) => s === '.' || s === '')) return 'non-canonical path';
  if (segs.some((s) => s.toLowerCase() === '.git' || s.toLowerCase() === 'node_modules')) return 'forbidden directory';
  if (segs.some((s) => /[.\s]$/.test(s) && s !== '')) return 'segment ends with dot or space';
  const n = normalizePath(p);
  if (!ALLOWED.some((re) => re.test(n))) return 'not in test-file allowlist';
  if (opts.isSymlink?.(n)) return 'symlink';
  return null;
}

export function guardPaths(paths: string[] | null | undefined, opts: GuardOptions = {}): GuardResult {
  const allowed: string[] = [];
  const violations: Violation[] = [];
  for (const raw of Array.isArray(paths) ? paths : []) {
    const reason = checkPath(raw, opts);
    if (reason) violations.push({ path: String(raw), reason });
    else allowed.push(normalizePath(raw.replace(/\\/g, '/')));
  }
  return { ok: violations.length === 0, allowed, violations };
}
