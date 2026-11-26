import { expect, it } from 'vitest'
import { queryClient } from './queryClient'

it('uses the configured caching and retry defaults', () => {
  const defaults = queryClient.getDefaultOptions()
  expect(defaults.queries).toMatchObject({ staleTime: 30_000, retry: 1 })
  expect(defaults.mutations).toMatchObject({ retry: false })
})
