import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TodoStats } from './TodoStats'
import type { Todo } from '../types'

vi.mock('../../../design-system', () => import('../../../design-system/mocks'))

const base: Todo = {
  id: 1,
  title: 'Task',
  description: '',
  priority: 'medium',
  completed: false,
  due_date: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 15, 12))
})
afterEach(() => vi.useRealTimers())

it('shows totals without an overdue segment when nothing is overdue', () => {
  render(<TodoStats todos={[base, { ...base, id: 2, completed: true }]} />)
  const region = screen.getByRole('region', { name: 'Task statistics' })
  expect(region).toHaveTextContent('2 total · 1 active · 1 completed')
  expect(region).not.toHaveTextContent('overdue')
})

it('shows the overdue count when tasks are overdue', () => {
  render(<TodoStats todos={[{ ...base, due_date: '2026-11-01' }]} />)
  expect(
    screen.getByRole('region', { name: 'Task statistics' }),
  ).toHaveTextContent('1 total · 1 active · 0 completed · 1 overdue')
})
