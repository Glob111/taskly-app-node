import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDatabaseUrl } from '../src/core/config.ts';

const parts = { POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pw', POSTGRES_HOST: 'db', DB_PORT: '5432', POSTGRES_DB: 'taskly' };
function clearEnv() {
  vi.stubEnv('DATABASE_URL', undefined);
  for (const key of Object.keys(parts)) vi.stubEnv(key, undefined);
}
afterEach(() => vi.unstubAllEnvs());

describe('resolveDatabaseUrl', () => {
  it('prefers the explicit override over DATABASE_URL', () => {
    clearEnv();
    vi.stubEnv('DATABASE_URL', 'postgresql://env/db');
    expect(resolveDatabaseUrl('postgresql://override/db')).toBe('postgresql://override/db');
  });
  it('uses DATABASE_URL when no override is given', () => {
    clearEnv();
    vi.stubEnv('DATABASE_URL', 'postgresql://env/db');
    expect(resolveDatabaseUrl()).toBe('postgresql://env/db');
  });
  it('rewrites the SQLAlchemy psycopg scheme', () => {
    clearEnv();
    expect(resolveDatabaseUrl('postgresql+psycopg://u:p@h:5432/d')).toBe('postgresql://u:p@h:5432/d');
  });
  it('builds the URL from individual variables', () => {
    clearEnv();
    for (const [k, v] of Object.entries(parts)) vi.stubEnv(k, v);
    expect(resolveDatabaseUrl()).toBe('postgresql://user:pw@db:5432/taskly');
  });
  it('encodes special characters in credentials and database name', () => {
    clearEnv();
    for (const [k, v] of Object.entries({ ...parts, POSTGRES_PASSWORD: 'p@ss/w:rd', POSTGRES_DB: 'my db' })) vi.stubEnv(k, v);
    const url = new URL(resolveDatabaseUrl());
    expect(decodeURIComponent(url.password)).toBe('p@ss/w:rd');
    expect(url.hostname).toBe('db');
    expect(url.pathname).toBe('/my%20db');
  });
  it.each(Object.keys(parts))('throws naming the missing variable %s', (missing) => {
    clearEnv();
    for (const [k, v] of Object.entries(parts)) vi.stubEnv(k, k === missing ? undefined : v);
    expect(() => resolveDatabaseUrl()).toThrow(`Missing environment variable: ${missing}`);
  });
});
