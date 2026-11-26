export type Mode = 'run' | 'skip-no-secret' | 'skip-fork';
export interface ModeInput {
  eventName?: string;
  baseRepo?: string;       // github.repository
  headRepo?: string;       // github.event.pull_request.head.repo.full_name
  isFork?: boolean;        // explicit flag if known
  secret?: string;         // the secret value (never logged)
}
export interface ModeResult { mode: Mode; reason: string }

export function decideMode(i: ModeInput = {}): ModeResult {
  const event = i.eventName ?? '';
  const isPr = event === 'pull_request' || event === 'pull_request_target';
  const base = (i.baseRepo ?? '').trim().toLowerCase();
  const head = (i.headRepo ?? '').trim().toLowerCase();
  // Fail closed: fork unless we can positively show head repo === base repo.
  if (i.isFork === true) return { mode: 'skip-fork', reason: 'PR comes from a fork' };
  if (event === 'pull_request_target') return { mode: 'skip-fork', reason: 'pull_request_target is never run with secrets' };
  if (isPr && (!head || !base || head !== base)) {
    return { mode: 'skip-fork', reason: head && base ? 'head repo differs from base repo' : 'cannot verify head repo; failing closed' };
  }
  if (!i.secret || !i.secret.trim()) return { mode: 'skip-no-secret', reason: 'API key secret is not configured' };
  return { mode: 'run', reason: 'same-repo PR with secret available' };
}
