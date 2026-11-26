import { render, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { useTheme } from 'styled-components'
import { queryClient } from '../lib/queryClient'
import { AppProviders } from './AppProviders'

vi.mock('../design-system', async () => {
  const mocks = await import('../design-system/mocks')
  return mocks
})

function Probe() {
  const client = useQueryClient()
  const theme = useTheme()
  return (
    <p data-testid="probe">
      {client === queryClient ? 'default' : 'custom'}:{typeof theme}
    </p>
  )
}

it('provides the shared query client and theme by default', () => {
  render(
    <AppProviders>
      <Probe />
    </AppProviders>,
  )
  expect(screen.getByTestId('probe')).toHaveTextContent('default:object')
})

it('accepts a custom query client', () => {
  render(
    <AppProviders client={new QueryClient()}>
      <Probe />
    </AppProviders>,
  )
  expect(screen.getByTestId('probe')).toHaveTextContent('custom')
})
