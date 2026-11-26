import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { createHealthRouter } from '../src/api/health.ts';

function setup(findFirst: ReturnType<typeof vi.fn>) {
  const database = { todo: { findFirst } } as never;
  const app = express();
  app.use('/api', createHealthRouter(database));
  return app;
}
it('reports ok after querying the database', async () => {
  const findFirst = vi.fn().mockResolvedValue(null);
  const response = await request(setup(findFirst)).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
  expect(findFirst).toHaveBeenCalledWith({ select: { id: true } });
});
it('returns 500 when the database check fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await request(setup(vi.fn().mockRejectedValue(new Error('down')))).get('/api/health');
  expect(response.status).toBe(500);
  vi.restoreAllMocks();
});
