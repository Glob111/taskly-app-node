import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import { useUpdateTodoMutation } from './useUpdateTodoMutation'

vi.mock('../api/todos', () => ({ todosApi: { update: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('replaces only the updated task in the cached list', async () => {
  const other = { ...todoFixture, id: 9 }
  const saved = { ...todoFixture, completed: true }
  vi.mocked(todosApi.update).mockResolvedValue(saved)
  const { client, wrapper } = createQueryWrapper()
  client.setQueryData(todoKeys.list, [todoFixture, other])
  const { result } = renderHook(() => useUpdateTodoMutation(), { wrapper })
  await act(() =>
    result.current.mutateAsync({ id: 7, input: { completed: true } }),
  )
  expect(todosApi.update).toHaveBeenCalledWith(7, { completed: true })
  expect(client.getQueryData(todoKeys.list)).toEqual([saved, other])
})

it('does not create a cache entry when no list is cached', async () => {
  vi.mocked(todosApi.update).mockResolvedValue(todoFixture)
  const { client, wrapper } = createQueryWrapper()
  const { result } = renderHook(() => useUpdateTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync({ id: 7, input: {} }))
  expect(client.getQueryData(todoKeys.list)).toBeUndefined()
})

it('keeps the cache and exposes the error on failure', async () => {
  vi.mocked(todosApi.update).mockRejectedValue(new Error('Conflict'))
  const { client, wrapper } = createQueryWrapper()
  client.setQueryData(todoKeys.list, [todoFixture])
  const { result } = renderHook(() => useUpdateTodoMutation(), { wrapper })
  await act(() =>
    result.current
      .mutateAsync({ id: 7, input: { completed: true } })
      .catch(() => undefined),
  )
  await waitFor(() => expect(result.current.error?.message).toBe('Conflict'))
  expect(client.getQueryData(todoKeys.list)).toEqual([todoFixture])
})
