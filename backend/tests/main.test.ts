import { afterEach, expect, it, vi } from 'vitest';

const start = vi.hoisted(() => vi.fn());
vi.mock('../src/core/lifespan.js', () => ({ start }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  start.mockReset();
  process.exitCode = undefined;
});

it('starts the API on import', async () => {
  start.mockResolvedValue({});
  await import('../src/main.ts');
  expect(start).toHaveBeenCalledOnce();
  expect(process.exitCode).toBeUndefined();
});
it('logs and sets a failing exit code when startup fails', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const failure = new Error('boom');
  start.mockRejectedValue(failure);
  await import('../src/main.ts');
  await vi.waitFor(() => expect(process.exitCode).toBe(1));
  expect(error).toHaveBeenCalledWith('Cannot start Taskly App Node API:', failure);
});
