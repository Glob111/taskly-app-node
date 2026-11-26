import { describe, it, expect } from 'vitest';
import { computeStats } from '../src/features/todos/stats.ts';
import { todo } from './fixture.ts';

const today = new Date('2026-11-15T12:00:00Z');

describe('computeStats', () => {
  it('returns zeros for an empty list', () => {
    expect(computeStats([], today)).toEqual({ total: 0, completed: 0, active: 0, overdue: 0, by_priority: { low: 0, medium: 0, high: 0 } });
  });

  it('counts completed, active and priorities', () => {
    const todos = [
      { ...todo, id: 1, priority: 'high' as const, completed: true },
      { ...todo, id: 2, priority: 'low' as const, due_date: null },
      { ...todo, id: 3, priority: 'low' as const, due_date: null },
      { ...todo, id: 4, priority: 'medium' as const, due_date: null },
    ];
    expect(computeStats(todos, today)).toEqual({ total: 4, completed: 1, active: 3, overdue: 0, by_priority: { low: 2, medium: 1, high: 1 } });
  });

  it('counts only active todos due before today as overdue', () => {
    const todos = [
      { ...todo, id: 1, due_date: '2026-11-14' },
      { ...todo, id: 2, due_date: '2026-11-15' },
      { ...todo, id: 3, due_date: '2026-11-16' },
      { ...todo, id: 4, due_date: null },
      { ...todo, id: 5, due_date: '2026-11-01', completed: true },
    ];
    expect(computeStats(todos, today).overdue).toBe(1);
  });
});
