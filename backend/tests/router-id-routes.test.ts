import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createTodosRouter } from '../src/features/todos/router.ts';
import { todo } from './fixture.ts';

function setup() {
  const repository = { list: vi.fn(), create: vi.fn(), get: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const app = express();
  app.use(express.json());
  app.use('/api/todos', createTodosRouter(repository));
  return { app, repository };
}

describe('GET /:id', () => {
  it('returns the task', async () => {
    const { app, repository } = setup();
    repository.get.mockResolvedValue(todo);
    const response = await request(app).get('/api/todos/1');
    expect(response.body).toEqual(todo);
    expect(repository.get).toHaveBeenCalledWith(1);
  });
  it('404s when missing', async () => {
    const { app, repository } = setup();
    repository.get.mockResolvedValue(null);
    const response = await request(app).get('/api/todos/5');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ detail: 'Task not found.' });
  });
  it.each(['abc', '0', '-1', '1.5'])('422s for invalid id %s without hitting the repository', async (id) => {
    const { app, repository } = setup();
    expect((await request(app).get(`/api/todos/${id}`)).status).toBe(422);
    expect(repository.get).not.toHaveBeenCalled();
  });
});
describe('PATCH /:id', () => {
  it('updates with validated input', async () => {
    const { app, repository } = setup();
    repository.update.mockResolvedValue(todo);
    const response = await request(app).patch('/api/todos/1').send({ completed: true, title: '  New ' });
    expect(response.status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(1, { completed: true, title: 'New' });
  });
  it('404s when missing', async () => {
    const { app, repository } = setup();
    repository.update.mockResolvedValue(null);
    expect((await request(app).patch('/api/todos/1').send({ completed: true })).status).toBe(404);
  });
  it.each([{}, { unknown: 1 }, { priority: 'urgent' }])('422s for invalid body %j', async (body) => {
    const { app, repository } = setup();
    expect((await request(app).patch('/api/todos/1').send(body)).status).toBe(422);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('422s for invalid id', async () => {
    const { app } = setup();
    expect((await request(app).patch('/api/todos/x').send({ completed: true })).status).toBe(422);
  });
});
describe('DELETE /:id', () => {
  it('returns 204 with empty body', async () => {
    const { app, repository } = setup();
    repository.delete.mockResolvedValue(true);
    const response = await request(app).delete('/api/todos/3');
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(repository.delete).toHaveBeenCalledWith(3);
  });
  it('404s when missing', async () => {
    const { app, repository } = setup();
    repository.delete.mockResolvedValue(false);
    expect((await request(app).delete('/api/todos/3')).status).toBe(404);
  });
  it('422s for invalid id', async () => {
    const { app } = setup();
    expect((await request(app).delete('/api/todos/0')).status).toBe(422);
  });
});
