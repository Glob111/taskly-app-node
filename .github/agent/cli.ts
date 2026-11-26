#!/usr/bin/env node
// Usage: node .github/agent/cli.ts <classify|map|guard|prompt|comment|mode|dry-run> [flags]
// JSON on stdin (or --input <file>); JSON/markdown on stdout. No network, no secrets logged.
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDiff } from './classify-diff.ts';
import { mapTests } from './map-tests.ts';
import { guardPaths } from './path-guard.ts';
import { buildPrompt } from './build-prompt.ts';
import { parseVitest } from './parse-vitest.ts';
import { formatComment } from './format-comment.ts';
import type { ReportInput } from './format-comment.ts';
import { decideMode } from './check-secret.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

export function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
}

function files(input: any): any[] {
  return Array.isArray(input) ? input : Array.isArray(input?.files) ? input.files : [];
}

export function dryRun(fixtureDir = join(HERE, 'fixtures')): { markdown: string; json: Record<string, unknown> } {
  const rd = (n: string) => JSON.parse(readFileSync(join(fixtureDir, n), 'utf8'));
  const changed = rd('changed-files.json');
  const pr = rd('pr.json');
  const agent = rd('mock-agent-result.json');
  const cls = classifyDiff(changed);
  const mapping = mapTests(cls.sourceFiles, () => false);
  const prompt = buildPrompt({ ...pr, changedFiles: cls.sourceFiles });
  const guard = guardPaths(agent.filesWritten);
  const report: ReportInput = {
    mode: 'run',
    decisions: agent.decisions,
    skills: agent.skills,
    filesChanged: guard.allowed,
    violations: guard.violations,
    results: { backend: parseVitest(agent.vitest?.backend), frontend: parseVitest(agent.vitest?.frontend) },
    coverage: agent.coverage,
  };
  return { markdown: formatComment(report), json: { classification: cls, mapping, guard, promptChars: prompt.length } };
}

export function main(argv: string[], stdin: () => string, env: Record<string, string | undefined>): { out: string; code: number } {
  const cmd = argv[0];
  const inFile = flag(argv, 'input');
  const readJson = (): any => {
    const raw = inFile ? readFileSync(inFile, 'utf8') : stdin();
    return raw.trim() ? JSON.parse(raw) : undefined;
  };
  const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
  switch (cmd) {
    case 'classify': return { out: json(classifyDiff(files(readJson()))), code: 0 };
    case 'map': {
      const root = resolve(flag(argv, 'root') ?? '.');
      const src = files(readJson()).map((f) => (typeof f === 'string' ? f : f?.path));
      return { out: json(mapTests(src, (p) => existsSync(join(root, p)))), code: 0 };
    }
    case 'guard': {
      const root = flag(argv, 'root');
      const res = guardPaths(files(readJson()).map((f) => (typeof f === 'string' ? f : f?.path)), {
        isSymlink: root ? (p) => { try { return lstatSync(join(root, p)).isSymbolicLink(); } catch { return false; } } : undefined,
      });
      return { out: json(res), code: res.ok ? 0 : 2 };
    }
    case 'prompt': return { out: buildPrompt(readJson() ?? {}) + '\n', code: 0 };
    case 'comment': {
      const input = readJson() ?? {};
      const parse = (v: unknown) => (v && typeof v === 'object' && 'valid' in (v as object) ? v : parseVitest(v));
      const results = input.results ? { backend: parse(input.results.backend), frontend: parse(input.results.frontend) } : undefined;
      return { out: formatComment({ mode: 'run', ...input, results } as ReportInput), code: 0 };
    }
    case 'mode': {
      const input = (inFile || argv.includes('--stdin') ? readJson() : undefined) ?? {};
      const res = decideMode({
        eventName: flag(argv, 'event') ?? input.eventName ?? env.GITHUB_EVENT_NAME,
        baseRepo: flag(argv, 'base') ?? input.baseRepo ?? env.GITHUB_REPOSITORY,
        headRepo: flag(argv, 'head') ?? input.headRepo,
        isFork: argv.includes('--fork') ? true : input.isFork,
        secret: env.AGENT_API_KEY ?? env.ANTHROPIC_API_KEY, // read from env only, never printed
      });
      return { out: json(res), code: 0 };
    }
    case 'dry-run': {
      const r = dryRun(flag(argv, 'fixtures'));
      return { out: argv.includes('--json') ? json(r.json) : r.markdown, code: 0 };
    }
    default:
      return { out: 'usage: cli.ts <classify|map|guard|prompt|comment|mode|dry-run> [--input file] [--dry-run]\n', code: 64 };
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2).map((a) => (a === '--dry-run' ? 'dry-run' : a));
  if (argv.includes('dry-run')) argv.unshift(...argv.splice(argv.indexOf('dry-run'), 1));
  try {
    const { out, code } = main(argv, () => readFileSync(0, 'utf8'), process.env);
    process.stdout.write(out);
    process.exitCode = code;
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    process.exitCode = 1;
  }
}
