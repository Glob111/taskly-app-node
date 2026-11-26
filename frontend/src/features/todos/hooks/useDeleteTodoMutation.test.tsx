import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { todoFixture } from '../../../test/todoFixture'
import { todoKeys } from '../api/queryKeys'
import { todosApi } from '../api/todos'
import { useDeleteTodoMutation } from './useDeleteTodoMutation'

vi.mock('../api/todos', () => ({ todosApi: { remove: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('removes the deleted task from the cached list', async () => {
  const other = { ...todoFixture, id: 9 }
  vi.mocked(todosApi.remove).mockResolvedValue(undefined)
  const { client, wrapper } = createQueryWrapper()
  client.setQueryData(todoKeys.list, [todoFixture, other])
  const { result } = renderHook(() => useDeleteTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync(7))
  expect(todosApi.remove).toHaveBeenCalledWith(7)
  expect(client.getQueryData(todoKeys.list)).toEqual([other])
})

it('does not create a cache entry when no list is cached', async () => {
  vi.mocked(todosApi.remove).mockResolvedValue(undefined)
  const { client, wrapper } = createQueryWrapper()
  const { result } = renderHook(() => useDeleteTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync(7))
  expect(client.getQueryData(todoKeys.list)).toBeUndefined()
})

it('keeps the task and exposes the error on failure', async () => {
  vi.mocked(todosApi.remove).mockRejectedValue(new Error('Forbidden'))
  const { client, wrapper } = createQueryWrapper()
  client.setQueryData(todoKeys.list, [todoFixture])
  const { result } = renderHook(() => useDeleteTodoMutation(), { wrapper })
  await act(() => result.current.mutateAsync(7).catch(() => undefined))
  await waitFor(() => expect(result.current.error?.message).toBe('Forbidden'))
  expect(client.getQueryData(todoKeys.list)).toEqual([todoFixture])
})
