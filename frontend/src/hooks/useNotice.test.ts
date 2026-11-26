import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotice } from './useNotice'

it('starts without a notice and exposes a notification callback', () => {
  const { result } = renderHook(() => useNotice())
  expect(result.current.message).toBe('')
  expect(result.current.notify).toEqual(expect.any(Function))
})

describe('notification lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows a message and clears it after four seconds', () => {
    const { result } = renderHook(() => useNotice())
    act(() => result.current.notify('Saved'))
    expect(result.current.message).toBe('Saved')
    act(() => vi.advanceTimersByTime(3999))
    expect(result.current.message).toBe('Saved')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.message).toBe('')
  })

  it('restarts the timer when a new message replaces the old one', () => {
    const { result } = renderHook(() => useNotice())
    act(() => result.current.notify('First'))
    act(() => vi.advanceTimersByTime(3000))
    act(() => result.current.notify('Second'))
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.message).toBe('Second')
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.message).toBe('')
  })

  it('does not leave a pending timer after unmount', () => {
    const { result, unmount } = renderHook(() => useNotice())
    act(() => result.current.notify('Bye'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
