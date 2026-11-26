import type { Todo } from './types.js';

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  by_priority: { low: number; medium: number; high: number };
}

/** Summarize todos. A todo is overdue when it is not completed and its due date is before `today` (UTC). */
export function computeStats(todos: Todo[], today: Date = new Date()): TodoStats {
  const todayKey = today.toISOString().slice(0, 10);
  const stats: TodoStats = {
    total: todos.length,
    completed: 0,
    active: 0,
    overdue: 0,
    by_priority: { low: 0, medium: 0, high: 0 },
  };
  for (const todo of todos) {
    if (todo.completed) stats.completed += 1;
    else {
      stats.active += 1;
      if (todo.due_date && todo.due_date < todayKey) stats.overdue += 1;
    }
    stats.by_priority[todo.priority] += 1;
  }
  return stats;
}
