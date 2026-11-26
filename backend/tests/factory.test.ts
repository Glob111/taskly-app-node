import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/factory.ts';
import { record } from './fixture.ts';

function makeDb() {
  return { todo: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([record]), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } };
}
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('serves health and hides x-powered-by', async () => {
  const response = await request(createApp(makeDb() as never)).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
  expect(response.headers['x-powered-by']).toBeUndefined();
});
it('serves the OpenAPI specification', async () => {
  const response = await request(createApp(makeDb() as never)).get('/openapi.json');
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('openapi');
});
it('serves swagger docs', async () => {
  const response = await request(createApp(makeDb() as never)).get('/docs/');
  expect(response.status).toBe(200);
  expect(response.text).toContain('swagger');
});
it('mounts the todos router', async () => {
  const response = await request(createApp(makeDb() as never)).get('/api/todos');
  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(1);
});
it('returns a JSON 404 for unknown routes', async () => {
  const response = await request(createApp(makeDb() as never)).get('/nope');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ detail: 'Not Found' });
});
it('returns 422 for malformed JSON', async () => {
  const response = await request(createApp(makeDb() as never)).post('/api/todos').set('Content-Type', 'application/json').send('{bad');
  expect(response.status).toBe(422);
  expect(response.body).toEqual({ detail: 'Invalid JSON.' });
});
it('returns 413 for oversized bodies', async () => {
  const response = await request(createApp(makeDb() as never)).post('/api/todos').send({ title: 'x'.repeat(200 * 1024) });
  expect(response.status).toBe(413);
  expect(response.body).toEqual({ detail: 'Request body too large.' });
});
it('returns a generic 500 without leaking error details', async () => {
  const db = makeDb();
  db.todo.findMany.mockRejectedValue(new Error('secret connection string'));
  const response = await request(createApp(db as never)).get('/api/todos');
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ detail: 'Internal Server Error' });
  expect(JSON.stringify(response.body)).not.toContain('secret');
  expect(console.error).toHaveBeenCalled();
});
