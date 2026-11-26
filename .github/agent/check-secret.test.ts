import { decideMode } from './check-secret.ts';

const base = { eventName: 'pull_request', baseRepo: 'o/r', headRepo: 'o/r', secret: 'k' };
describe('decideMode', () => {
  it('runs for same-repo PR with secret', () => expect(decideMode(base).mode).toBe('run'));
  it('case-insensitive repo compare', () => expect(decideMode({ ...base, headRepo: 'O/R' }).mode).toBe('run'));
  it('skips forks even with secret', () => {
    expect(decideMode({ ...base, headRepo: 'evil/r' }).mode).toBe('skip-fork');
    expect(decideMode({ ...base, isFork: true }).mode).toBe('skip-fork');
  });
  it('fails closed on missing head info', () => {
    expect(decideMode({ eventName: 'pull_request', baseRepo: 'o/r', secret: 'k' }).mode).toBe('skip-fork');
    expect(decideMode({}).mode).toBe('skip-no-secret');
  });
  it('never runs pull_request_target', () => expect(decideMode({ ...base, eventName: 'pull_request_target' }).mode).toBe('skip-fork'));
  it('skips without secret', () => {
    expect(decideMode({ ...base, secret: '' }).mode).toBe('skip-no-secret');
    expect(decideMode({ ...base, secret: '  ' }).mode).toBe('skip-no-secret');
    expect(decideMode({ ...base, secret: undefined }).mode).toBe('skip-no-secret');
  });
  it('fork takes priority over no secret', () => expect(decideMode({ ...base, headRepo: 'x/y', secret: '' }).mode).toBe('skip-fork'));
  it('does not leak secret in reason', () => expect(JSON.stringify(decideMode({ ...base, secret: 'SUPERSECRET' }))).not.toMatch(/SUPERSECRET/));
});
