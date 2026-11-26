import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import type { TodoInput } from '../types'
import { useCreateTodoMutation } from './useCreateTodoMutation'

vi.mock('../api/todos', () => ({ todosApi: { create: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

const input: TodoInput = {
  title: 'New',
  description: '',
  priority: 'low',
  due_date: null,
  completed: false,
}

it('prepends the saved task to the cached list without duplicates', async () => {
  const saved = { ...todoFixture, id: 8, title: 'New' }
  vi.mocked(todosApi.create).mockResolvedValue(saved)
  const { client, wrapper } = createQueryWrapper()
  client.setQueryData(todoKeys.list, [todoFixture, saved])
  const { result } = renderHook(() => useCreateTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync(input))
  expect(todosApi.create).toHaveBeenCalledWith(input)
  expect(client.getQueryData(todoKeys.list)).toEqual([saved, todoFixture])
})

it('creates the list when nothing is cached', async () => {
  vi.mocked(todosApi.create).mockResolvedValue(todoFixture)
  const { client, wrapper } = createQueryWrapper()
  const { result } = renderHook(() => useCreateTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync(input))
  expect(client.getQueryData(todoKeys.list)).toEqual([todoFixture])
})

it('leaves the cache untouched and exposes the error on failure', async () => {
  vi.mocked(todosApi.create).mockRejectedValue(new Error('Nope'))
  const { client, wrapper } = createQueryWrapper()
  client.setQueryData(todoKeys.list, [todoFixture])
  const { result } = renderHook(() => useCreateTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync(input).catch(() => undefined))
  await waitFor(() => expect(result.current.error?.message).toBe('Nope'))
  expect(client.getQueryData(todoKeys.list)).toEqual([todoFixture])
})
