import { act, renderHook, waitFor } from '@testing-library/react'
import { useMutation } from '@tanstack/react-query'
import { expect, it } from 'vitest'
import { createQueryWrapper } from '../../../test/queryWrapper'
import { todoKeys } from '../api/queryKeys'
import { useTodosBusy } from './useTodosBusy'

it('is busy only while a todo mutation is in flight', async () => {
  const { wrapper } = createQueryWrapper()
  let release!: () => void
  const { result } = renderHook(
    () => ({
      busy: useTodosBusy(),
      todo: useMutation({
        mutationKey: todoKeys.update,
        mutationFn: () => new Promise<void>((r) => (release = r)),
      }),
      other: useMutation({
        mutationKey: ['unrelated'],
        mutationFn: () => new Promise<void>(() => undefined),
      }),
    }),
    { wrapper },
  )
  expect(result.current.busy).toBe(false)
  act(() => result.current.other.mutate())
  await waitFor(() => expect(result.current.other.isPending).toBe(true))
  expect(result.current.busy).toBe(false)
  act(() => result.current.todo.mutate())
  await waitFor(() => expect(result.current.busy).toBe(true))
  await act(async () => release())
  await waitFor(() => expect(result.current.busy).toBe(false))
})
