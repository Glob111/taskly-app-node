import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ PrismaPg: vi.fn(), PrismaClient: vi.fn() }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: mocks.PrismaPg }));
vi.mock('../src/generated/prisma/client.js', () => ({ PrismaClient: mocks.PrismaClient }));

import { createDatabase, initialize } from '../src/core/database.ts';

beforeEach(() => vi.clearAllMocks());

it('creates a client with a pg adapter using the connection string and timeout', () => {
  const client = createDatabase('postgresql://x/y');
  expect(mocks.PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgresql://x/y', connectionTimeoutMillis: 10000 });
  expect(mocks.PrismaClient).toHaveBeenCalledWith({ adapter: mocks.PrismaPg.mock.instances[0] });
  expect(client).toBe(mocks.PrismaClient.mock.instances[0]);
});
it('initialize runs an idempotent CREATE TABLE statement', async () => {
  const $executeRaw = vi.fn().mockResolvedValue(0);
  await initialize({ $executeRaw } as never);
  expect($executeRaw).toHaveBeenCalledOnce();
  const sql = ($executeRaw.mock.calls[0][0] as string[]).join('');
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS todos');
  expect(sql).toContain("priority IN ('low', 'medium', 'high')");
});
it('initialize propagates database errors', async () => {
  await expect(initialize({ $executeRaw: vi.fn().mockRejectedValue(new Error('boom')) } as never)).rejects.toThrow('boom');
});
