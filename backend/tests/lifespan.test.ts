import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createDatabase: vi.fn(), initialize: vi.fn(), resolveDatabaseUrl: vi.fn(), createApp: vi.fn() }));
vi.mock('../src/core/database.js', () => ({ createDatabase: mocks.createDatabase, initialize: mocks.initialize }));
vi.mock('../src/core/config.js', () => ({ resolveDatabaseUrl: mocks.resolveDatabaseUrl }));
vi.mock('../src/factory.js', () => ({ createApp: mocks.createApp }));

import { start } from '../src/core/lifespan.ts';

let database: { $connect: ReturnType<typeof vi.fn>; $disconnect: ReturnType<typeof vi.fn> };
let server: EventEmitter & { address: () => { port: number }; close: ReturnType<typeof vi.fn> };
let listen: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  database = { $connect: vi.fn().mockResolvedValue(undefined), $disconnect: vi.fn().mockResolvedValue(undefined) };
  server = Object.assign(new EventEmitter(), { address: () => ({ port: 8123 }), close: vi.fn() });
  listen = vi.fn((_port: number, _host: string, cb: () => void) => { queueMicrotask(cb); return server; });
  mocks.resolveDatabaseUrl.mockReturnValue('postgresql://x/y');
  mocks.createDatabase.mockReturnValue(database);
  mocks.initialize.mockResolvedValue(undefined);
  mocks.createApp.mockReturnValue({ listen });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  process.exitCode = undefined;
});

describe('start', () => {
  it('connects, initializes, and listens on API_PORT', async () => {
    vi.stubEnv('API_PORT', '9001');
    const result = await start();
    expect(mocks.createDatabase).toHaveBeenCalledWith('postgresql://x/y');
    expect(database.$connect).toHaveBeenCalled();
    expect(mocks.initialize).toHaveBeenCalledWith(database);
    expect(mocks.createApp).toHaveBeenCalledWith(database);
    expect(listen).toHaveBeenCalledWith(9001, '0.0.0.0', expect.any(Function));
    expect(result).toEqual({ server, database });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('8123'));
  });
  it('defaults to port 8000', async () => {
    vi.stubEnv('API_PORT', undefined);
    await start();
    expect(listen.mock.calls[0][0]).toBe(8000);
  });
  it('disconnects and rethrows when connecting fails', async () => {
    database.$connect.mockRejectedValue(new Error('no db'));
    await expect(start()).rejects.toThrow('no db');
    expect(database.$disconnect).toHaveBeenCalledOnce();
    expect(mocks.createApp).not.toHaveBeenCalled();
  });
  it('disconnects and rethrows when initialization fails', async () => {
    mocks.initialize.mockRejectedValue(new Error('ddl'));
    await expect(start()).rejects.toThrow('ddl');
    expect(database.$disconnect).toHaveBeenCalledOnce();
  });
  it('disconnects and rethrows when the server emits an error (e.g. port in use)', async () => {
    listen.mockImplementation(() => { queueMicrotask(() => server.emit('error', new Error('EADDRINUSE'))); return server; });
    await expect(start()).rejects.toThrow('EADDRINUSE');
    expect(database.$disconnect).toHaveBeenCalledOnce();
  });
  it.each(['SIGTERM', 'SIGINT'] as const)('shuts down gracefully on %s', async (signal) => {
    await start();
    process.emit(signal);
    expect(server.close).toHaveBeenCalledOnce();
    await server.close.mock.calls[0][0]();
    expect(database.$disconnect).toHaveBeenCalledOnce();
    expect(process.exitCode).toBeUndefined();
  });
  it('sets a failing exit code when disconnect fails during shutdown', async () => {
    database.$disconnect.mockRejectedValue(new Error('x'));
    await start();
    process.emit('SIGTERM');
    await server.close.mock.calls[0][0]();
    expect(console.error).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
  it('forces exit(1) if the server does not close within 10s', async () => {
    await start();
    vi.useFakeTimers();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    process.emit('SIGTERM');
    vi.advanceTimersByTime(10000);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
