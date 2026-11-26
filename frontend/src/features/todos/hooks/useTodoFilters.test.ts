import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import type { Todo } from '../types'
import { useTodoFilters } from './useTodoFilters'

const done: Todo = { ...todoFixture, id: 8, title: 'Ship', completed: true }
const todos = [todoFixture, done]

it('starts with all tasks, newest first', () => {
  const { result } = renderHook(() => useTodoFilters(todos))
  expect(result.current).toMatchObject({
    filter: 'all',
    search: '',
    sort: 'newest',
  })
  expect(result.current.visible.map((t) => t.id)).toEqual([8, 7])
})

it('recomputes visible tasks when filter or search change', () => {
  const { result } = renderHook(() => useTodoFilters(todos))
  act(() => result.current.setFilter('completed'))
  expect(result.current.visible).toEqual([done])
  act(() => result.current.setFilter('all'))
  act(() => result.current.setSearch('demo'))
  expect(result.current.visible).toEqual([todoFixture])
  act(() => result.current.setSearch('nothing'))
  expect(result.current.visible).toEqual([])
})

it('applies the selected sort', () => {
  const high: Todo = { ...todoFixture, id: 3, priority: 'high' }
  const { result } = renderHook(() => useTodoFilters([todoFixture, high]))
  act(() => result.current.setSort('priority'))
  expect(result.current.sort).toBe('priority')
  expect(result.current.visible.map((t) => t.id)).toEqual([3, 7])
})
