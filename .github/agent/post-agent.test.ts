// End-to-end test of scripts/post-agent.sh in a throwaway git repo (no network, no secrets).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TRUSTED = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(TRUSTED, '.github/agent/scripts/post-agent.sh');

function sh(cwd: string, cmd: string, args: string[], env: Record<string, string> = {}) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
}

describe('post-agent.sh', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'post-agent-'));
    sh(dir, 'git', ['init', '-q']);
    sh(dir, 'git', ['config', 'user.email', 'a@b.c']);
    sh(dir, 'git', ['config', 'user.name', 't']);
    for (const d of ['backend/src', 'backend/tests', '.github/workflows']) mkdirSync(join(dir, d), { recursive: true });
    writeFileSync(join(dir, 'backend/src/a.ts'), 'a\n');
    writeFileSync(join(dir, 'backend/tests/old.test.ts'), 't\n');
    writeFileSync(join(dir, '.github/workflows/w.yml'), 'x\n');
    writeFileSync(join(dir, '.gitignore'), '.agent-run/\n');
    sh(dir, 'git', ['add', '-A']);
    sh(dir, 'git', ['commit', '-qm', 'init']);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('keeps new test files and reverts source edits, workflow edits and deletions', () => {
    sh(dir, 'git', ['add', '-A']);
    const pre = sh(dir, 'git', ['write-tree']);
    sh(dir, 'git', ['reset', '-q']);

    writeFileSync(join(dir, 'backend/tests/new.test.ts'), 'new\n');
    writeFileSync(join(dir, 'backend/src/a.ts'), 'evil\n');
    writeFileSync(join(dir, '.github/workflows/w.yml'), 'evil\n');
    rmSync(join(dir, 'backend/tests/old.test.ts'));
    mkdirSync(join(dir, '.agent-run'));

    sh(dir, 'bash', [SCRIPT, pre], { TRUSTED });

    const guard = JSON.parse(readFileSync(join(dir, '.agent-run/guard.json'), 'utf8'));
    expect(guard.allowed).toEqual(['backend/tests/new.test.ts']);
    expect(guard.violations.map((v: { path: string }) => v.path).sort()).toEqual([
      '.github/workflows/w.yml', 'backend/src/a.ts', 'backend/tests/old.test.ts',
    ]);
    expect(readFileSync(join(dir, 'backend/src/a.ts'), 'utf8')).toBe('a\n');
    expect(readFileSync(join(dir, '.github/workflows/w.yml'), 'utf8')).toBe('x\n');
    expect(existsSync(join(dir, 'backend/tests/old.test.ts'))).toBe(true);
    expect(existsSync(join(dir, 'backend/tests/new.test.ts'))).toBe(true);
  });

  it('reports nothing when the agent changed nothing', () => {
    sh(dir, 'git', ['add', '-A']);
    const pre = sh(dir, 'git', ['write-tree']);
    sh(dir, 'git', ['reset', '-q']);
    mkdirSync(join(dir, '.agent-run'));
    sh(dir, 'bash', [SCRIPT, pre], { TRUSTED });
    expect(JSON.parse(readFileSync(join(dir, '.agent-run/guard.json'), 'utf8'))).toEqual({ allowed: [], violations: [] });
  });
});
