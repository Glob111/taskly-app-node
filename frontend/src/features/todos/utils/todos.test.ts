import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDate, isOverdue, selectTodos, validateTodo } from './todos'
import type { Todo } from '../types'

const base: Todo = {
  id: 1,
  title: 'Sprint plan',
  description: '',
  priority: 'medium',
  completed: false,
  due_date: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

describe('selectTodos', () => {
  it('combines status with a case-insensitive search in the description', () => {
    const matching = { ...base, description: 'Discuss the API' }
    const todos = [
      matching,
      { ...matching, id: 2, completed: true },
      { ...base, id: 3 },
    ]
    expect(selectTodos(todos, 'active', ' api ', 'newest')).toEqual([matching])
  })

  it('sorts by priority without changing the source array', () => {
    const high: Todo = { ...base, id: 2, priority: 'high' }
    const todos = [base, high]
    expect(selectTodos(todos, 'all', '', 'priority')).toEqual([high, base])
    expect(todos).toEqual([base, high])
  })
})

describe('selectTodos sorting', () => {
  it('sorts by due date with undated tasks last, then by newest id', () => {
    const undated = { ...base, id: 1 }
    const late = { ...base, id: 2, due_date: '2026-12-01' }
    const early = { ...base, id: 3, due_date: '2026-11-01' }
    const earlyNewer = { ...base, id: 4, due_date: '2026-11-01' }
    expect(
      selectTodos([undated, late, early, earlyNewer], 'all', '', 'due').map(
        (t) => t.id,
      ),
    ).toEqual([4, 3, 2, 1])
  })

  it('breaks priority ties by newest id and sorts newest by created_at', () => {
    const a = { ...base, id: 1, created_at: '2026-10-02T00:00:00Z' }
    const b = { ...base, id: 2 }
    expect(selectTodos([b, a], 'all', '', 'priority').map((t) => t.id)).toEqual(
      [2, 1],
    )
    expect(selectTodos([b, a], 'all', '', 'newest').map((t) => t.id)).toEqual([
      1, 2,
    ])
  })

  it('filters completed and active tasks', () => {
    const done = { ...base, id: 2, completed: true }
    expect(selectTodos([base, done], 'completed', '', 'newest')).toEqual([done])
    expect(selectTodos([base, done], 'active', '', 'newest')).toEqual([base])
  })
})

describe('validateTodo', () => {
  const valid = {
    title: 'Ok',
    description: '',
    priority: 'low' as const,
    due_date: null,
    completed: false,
  }

  it('accepts valid input', () => {
    expect(validateTodo({ ...valid, due_date: '2026-02-28' })).toEqual({})
  })

  it('rejects empty and overlong titles and descriptions', () => {
    expect(validateTodo({ ...valid, title: '   ' }).title).toBe(
      'Enter a task title.',
    )
    expect(validateTodo({ ...valid, title: 'x'.repeat(121) }).title).toMatch(
      /120/,
    )
    expect(
      validateTodo({ ...valid, description: 'x'.repeat(2001) }).description,
    ).toMatch(/2000/)
    expect(validateTodo({ ...valid, title: 'x'.repeat(120) })).toEqual({})
  })

  it.each(['2026-02-30', '2026-13-01', '26-1-1', 'abc'])(
    'rejects invalid due date %s',
    (due_date) => {
      expect(validateTodo({ ...valid, due_date }).due_date).toBe(
        'Enter a valid date.',
      )
    },
  )
})

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 15, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('is true only for incomplete tasks due before today', () => {
    expect(isOverdue({ ...base, due_date: '2026-11-14' })).toBe(true)
    expect(isOverdue({ ...base, due_date: '2026-11-15' })).toBe(false)
    expect(isOverdue({ ...base, due_date: '2026-11-16' })).toBe(false)
    expect(isOverdue({ ...base, due_date: null })).toBe(false)
    expect(
      isOverdue({ ...base, due_date: '2026-11-14', completed: true }),
    ).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats a date in en-GB short style', () => {
    expect(formatDate('2026-03-05')).toBe('5 Mar 2026')
  })
})
