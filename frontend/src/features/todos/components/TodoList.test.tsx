import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { todoFixture } from '../../../test/todoFixture'
import { TodoList } from './TodoList'

vi.mock('../../../design-system', () => import('../../../design-system/mocks'))
vi.mock('./TodoEmptyState', () => ({
  TodoEmptyState: () => <p>Empty task list</p>,
}))
vi.mock('./TodoItem', () => ({
  TodoItem: ({
    todo,
    busy,
    onToggle,
    onEdit,
    onDelete,
  }: {
    todo: { id: number }
    busy: boolean
    onToggle: () => void
    onEdit: () => void
    onDelete: () => void
  }) => (
    <li>
      Task
      <button disabled={busy} onClick={onToggle}>{`toggle ${todo.id}`}</button>
      <button onClick={onEdit}>{`edit ${todo.id}`}</button>
      <button onClick={onDelete}>{`delete ${todo.id}`}</button>
    </li>
  ),
}))

it('shows loading feedback before showing an empty list', () => {
  const props = {
    todos: [],
    hasTodos: false,
    failed: false,
    busy: false,
    onCreate: vi.fn(),
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }
  const { rerender } = render(<TodoList {...props} loading />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading your tasks…')
  expect(screen.queryByText('Empty task list')).not.toBeInTheDocument()
  rerender(<TodoList {...props} loading={false} />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByText('Empty task list')).toBeVisible()
})

const baseProps = {
  todos: [],
  hasTodos: false,
  loading: false,
  failed: false,
  busy: false,
  onCreate: vi.fn(),
  onToggle: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

it('shows an unavailable message when loading failed and nothing is cached', () => {
  render(<TodoList {...baseProps} failed />)
  expect(
    screen.getByRole('heading', {
      name: 'The task list is temporarily unavailable',
    }),
  ).toBeVisible()
  expect(screen.queryByText('Empty task list')).not.toBeInTheDocument()
})

it('keeps showing cached tasks when a refetch failed', () => {
  render(
    <TodoList
      {...baseProps}
      failed
      hasTodos
      todos={[todoFixture, { ...todoFixture, id: 8 }]}
    />,
  )
  expect(screen.getAllByText('Task')).toHaveLength(2)
  expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument()
})

it('forwards the clicked task to the toggle, edit and delete handlers', async () => {
  const user = userEvent.setup()
  const second = { ...todoFixture, id: 8 }
  const onToggle = vi.fn()
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(
    <TodoList
      {...baseProps}
      hasTodos
      todos={[todoFixture, second]}
      onToggle={onToggle}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'toggle 8' }))
  await user.click(screen.getByRole('button', { name: 'edit 7' }))
  await user.click(screen.getByRole('button', { name: 'delete 8' }))
  expect(onToggle).toHaveBeenCalledWith(second)
  expect(onEdit).toHaveBeenCalledWith(todoFixture)
  expect(onDelete).toHaveBeenCalledWith(second)
})

it('passes the busy flag down to items', () => {
  render(<TodoList {...baseProps} hasTodos busy todos={[todoFixture]} />)
  expect(screen.getByRole('button', { name: 'toggle 7' })).toBeDisabled()
})
