import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { useNotice } from '../../hooks/useNotice'
import { useTodoFilters } from './hooks/useTodoFilters'
import { useTodosBusy } from './hooks/useTodosBusy'
import { useTodosQuery } from './hooks/useTodosQuery'
import { useUpdateTodoMutation } from './hooks/useUpdateTodoMutation'
import { todoFixture } from '../../test/todoFixture'
import type { Todo } from './types'
import { TodosPage } from './TodosPage'

type TodoListProps = {
  todos: Todo[]
  loading: boolean
  onToggle: (todo: Todo) => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
}

vi.mock('../../design-system', () => import('../../design-system/mocks'))
vi.mock('../../hooks/useNotice', () => ({ useNotice: vi.fn() }))
vi.mock('./hooks/useTodoFilters', () => ({ useTodoFilters: vi.fn() }))
vi.mock('./hooks/useTodosBusy', () => ({ useTodosBusy: vi.fn() }))
vi.mock('./hooks/useTodosQuery', () => ({ useTodosQuery: vi.fn() }))
vi.mock('./hooks/useUpdateTodoMutation', () => ({
  useUpdateTodoMutation: vi.fn(),
}))
vi.mock('./components/TodosHeader', () => ({
  TodosHeader: ({
    disabled,
    onCreate,
  }: {
    disabled: boolean
    onCreate: () => void
  }) => (
    <button disabled={disabled} onClick={onCreate}>
      New task
    </button>
  ),
}))
vi.mock('./components/TodoFilters', () => ({ TodoFilters: () => null }))
vi.mock('./components/TodoList', () => ({
  TodoList: ({ todos, loading, onToggle, onEdit, onDelete }: TodoListProps) => (
    <div>
      <p>{loading ? 'loading' : `${todos.length} tasks`}</p>
      <button onClick={() => onToggle(todoFixture)}>toggle</button>
      <button onClick={() => onEdit(todoFixture)}>edit</button>
      <button onClick={() => onDelete(todoFixture)}>delete</button>
    </div>
  ),
}))
vi.mock('./components/TodoEditor', () => ({
  TodoEditor: ({
    todo,
    onClose,
    onSaved,
  }: {
    todo: Todo | 'new'
    onClose: () => void
    onSaved: (notice: string) => void
  }) => (
    <div>
      <p>editor:{todo === 'new' ? 'new' : todo.title}</p>
      <button onClick={onClose}>close editor</button>
      <button onClick={() => onSaved('Task saved.')}>save editor</button>
    </div>
  ),
}))
vi.mock('./components/DeleteTodoDialog', () => ({
  DeleteTodoDialog: ({
    todo,
    onClose,
    onDeleted,
  }: {
    todo: Todo
    onClose: () => void
    onDeleted: () => void
  }) => (
    <div>
      <p>deleting:{todo.title}</p>
      <button onClick={onClose}>close delete</button>
      <button onClick={onDeleted}>confirm delete</button>
    </div>
  ),
}))
vi.mock('../../components/SuccessNotice', () => ({ SuccessNotice: () => null }))

it('displays a query failure and resets mutation errors before retrying', async () => {
  const user = userEvent.setup()
  const refetch = vi.fn().mockResolvedValue(undefined)
  const reset = vi.fn()
  vi.mocked(useTodosQuery).mockReturnValue({
    data: [],
    isPending: false,
    isFetching: false,
    isError: true,
    error: new Error('The server is unavailable.'),
    refetch,
  } as unknown as ReturnType<typeof useTodosQuery>)
  vi.mocked(useUpdateTodoMutation).mockReturnValue({
    error: null,
    reset,
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof useUpdateTodoMutation>)
  vi.mocked(useTodosBusy).mockReturnValue(false)
  vi.mocked(useNotice).mockReturnValue({ message: '', notify: vi.fn() })
  vi.mocked(useTodoFilters).mockReturnValue({
    filter: 'all',
    search: '',
    sort: 'newest',
    visible: [],
    setFilter: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
  })
  render(<TodosPage />)
  expect(screen.getByTestId('alert')).toHaveTextContent(
    'The server is unavailable.',
  )
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1))
  expect(reset).toHaveBeenCalledTimes(1)
  expect(reset.mock.invocationCallOrder[0]).toBeLessThan(
    refetch.mock.invocationCallOrder[0],
  )
})

const notify = vi.fn()
const mutateAsync = vi.fn()
const reset = vi.fn()

function setup({
  query = {},
  mutation = {},
  busy = false,
}: { query?: object; mutation?: object; busy?: boolean } = {}) {
  vi.mocked(useTodosQuery).mockReturnValue({
    data: [todoFixture],
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...query,
  } as unknown as ReturnType<typeof useTodosQuery>)
  vi.mocked(useUpdateTodoMutation).mockReturnValue({
    error: null,
    reset,
    mutateAsync,
    ...mutation,
  } as unknown as ReturnType<typeof useUpdateTodoMutation>)
  vi.mocked(useTodosBusy).mockReturnValue(busy)
  vi.mocked(useNotice).mockReturnValue({ message: '', notify })
  vi.mocked(useTodoFilters).mockReturnValue({
    filter: 'all',
    search: '',
    sort: 'newest',
    visible: [todoFixture],
    setFilter: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
  })
  return userEvent.setup()
}

beforeEach(() => vi.clearAllMocks())

it('toggles a task and congratulates on completion', async () => {
  const user = setup()
  mutateAsync.mockResolvedValue({ ...todoFixture, completed: true })
  render(<TodosPage />)
  await user.click(screen.getByRole('button', { name: 'toggle' }))
  expect(mutateAsync).toHaveBeenCalledWith({
    id: todoFixture.id,
    input: { completed: true },
  })
  expect(notify).toHaveBeenCalledWith('Another task complete. Well done!')
})

it('announces when a task is marked active again', async () => {
  const user = setup()
  mutateAsync.mockResolvedValue({ ...todoFixture, completed: false })
  render(<TodosPage />)
  await user.click(screen.getByRole('button', { name: 'toggle' }))
  expect(notify).toHaveBeenCalledWith('Task marked as active.')
})

it('does not notify when toggling fails and shows the mutation error', async () => {
  const user = setup({ mutation: { error: new Error('Conflict') } })
  mutateAsync.mockRejectedValue(new Error('Conflict'))
  render(<TodosPage />)
  expect(screen.getByTestId('alert')).toHaveTextContent('Conflict')
  await user.click(screen.getByRole('button', { name: 'toggle' }))
  expect(notify).not.toHaveBeenCalled()
})

it('ignores toggle requests while another operation is busy', async () => {
  const user = setup({ busy: true })
  render(<TodosPage />)
  expect(screen.getByRole('button', { name: 'New task' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'toggle' }))
  expect(mutateAsync).not.toHaveBeenCalled()
})

it('disables creation and shows loading while tasks are pending', () => {
  setup({ query: { isPending: true, data: undefined } })
  render(<TodosPage />)
  expect(screen.getByRole('button', { name: 'New task' })).toBeDisabled()
  expect(screen.getByText('loading')).toBeVisible()
})

it('prefers the mutation error over the query error and disables retry while fetching', () => {
  setup({
    query: { error: new Error('Query'), isError: true, isFetching: true },
    mutation: { error: new Error('Mutation') },
  })
  render(<TodosPage />)
  expect(screen.getByTestId('alert')).toHaveTextContent('Mutation')
  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled()
})

it('shows task statistics only when tasks exist', () => {
  setup()
  const { unmount } = render(<TodosPage />)
  expect(
    screen.getByRole('region', { name: 'Task statistics' }),
  ).toHaveTextContent('1 total')
  unmount()
  setup({ query: { data: [] } })
  render(<TodosPage />)
  expect(
    screen.queryByRole('region', { name: 'Task statistics' }),
  ).not.toBeInTheDocument()
})

it('shows no alert without errors', () => {
  setup()
  render(<TodosPage />)
  expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
})

it('opens the editor for a new task, closes it, and notifies after saving', async () => {
  const user = setup()
  render(<TodosPage />)
  await user.click(screen.getByRole('button', { name: 'New task' }))
  expect(screen.getByText('editor:new')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'close editor' }))
  expect(screen.queryByText('editor:new')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'New task' }))
  await user.click(screen.getByRole('button', { name: 'save editor' }))
  expect(screen.queryByText('editor:new')).not.toBeInTheDocument()
  expect(notify).toHaveBeenCalledWith('Task saved.')
})

it('opens the editor for an existing task', async () => {
  const user = setup()
  render(<TodosPage />)
  await user.click(screen.getByRole('button', { name: 'edit' }))
  expect(screen.getByText(`editor:${todoFixture.title}`)).toBeVisible()
})

it('opens the delete dialog, can cancel it, and notifies after deletion', async () => {
  const user = setup()
  render(<TodosPage />)
  await user.click(screen.getByRole('button', { name: 'delete' }))
  expect(screen.getByText(`deleting:${todoFixture.title}`)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'close delete' }))
  expect(screen.queryByText(/^deleting:/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'delete' }))
  await user.click(screen.getByRole('button', { name: 'confirm delete' }))
  expect(screen.queryByText(/^deleting:/)).not.toBeInTheDocument()
  expect(notify).toHaveBeenCalledWith('Task deleted.')
})
