import { Text } from '../../../design-system'
import type { Todo } from '../types'
import { summarizeTodos } from '../utils/todos'

export function TodoStats({ todos }: { todos: Todo[] }) {
  const { total, active, completed, overdue } = summarizeTodos(todos)
  return (
    <section aria-label="Task statistics">
      <Text muted>
        {total} total · {active} active · {completed} completed
        {overdue > 0 ? ` · ${overdue} overdue` : ''}
      </Text>
    </section>
  )
}
