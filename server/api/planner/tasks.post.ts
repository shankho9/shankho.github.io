import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { cache } from '~/server/utils/cache'

interface TaskBody {
  title: string
  status?: 'doing' | 'done'
  is_mit?: boolean
  priority?: 'high' | 'medium' | 'low'
  planned_date?: string | null
  notes?: string | null
  theme?: string | null
  depends_on_task_id?: number | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TaskBody>(event)
  const {
    title,
    status = 'doing',
    is_mit = false,
    priority = 'medium',
    planned_date = null,
    notes = null,
    theme = null,
    depends_on_task_id = null,
  } = body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Title is required',
    })
  }

  if (title.length > 500) {
    throw createError({
      statusCode: 400,
      message: 'Title is too long (max 500 characters)',
    })
  }

  // Validate depends_on_task_id if provided
  if (depends_on_task_id !== null && depends_on_task_id !== undefined) {
    const parentTask = await query<{
      id: number
      status: string
      depends_on_task_id: number | null
      theme: string | null
    }>(
      'SELECT id, status, depends_on_task_id, theme FROM tasks WHERE id = $1 AND deleted_at IS NULL',
      [depends_on_task_id],
    )
    if (parentTask.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Parent task not found',
      })
    }
    if (parentTask[0].status === 'done') {
      throw createError({
        statusCode: 400,
        message: 'Cannot create dependency on a completed task',
      })
    }
    // Ensure parent task is in the same bucket (theme) as the new task
    const parentTheme = parentTask[0].theme?.trim() || null
    const newTaskTheme = theme?.trim() || null
    if (parentTheme !== newTaskTheme) {
      throw createError({
        statusCode: 400,
        message:
          'Cannot create dependency: parent task must be in the same bucket (theme) as the dependent task',
      })
    }

    // Check dependency depth - allow max 2 levels (0 -> 1 -> 2)
    // Calculate depth of parent task (how many ancestors it has)
    let parentDepth = 0
    let currentTaskId = depends_on_task_id
    const visited = new Set<number>()

    while (currentTaskId !== null && parentDepth < 3) {
      if (visited.has(currentTaskId)) {
        // Circular dependency - will be caught by other validation
        break
      }
      visited.add(currentTaskId)

      const task = await query<{ depends_on_task_id: number | null }>(
        'SELECT depends_on_task_id FROM tasks WHERE id = $1 AND deleted_at IS NULL',
        [currentTaskId],
      )

      if (task.length === 0 || !task[0].depends_on_task_id) {
        break
      }

      currentTaskId = task[0].depends_on_task_id
      parentDepth++
    }

    // New task depth = parent depth + 1
    // Max allowed depth is 2, so parent depth must be <= 1
    // If parent is at depth 0, new task will be at depth 1 (allowed)
    // If parent is at depth 1, new task will be at depth 2 (allowed)
    // If parent is at depth 2, new task would be at depth 3 (not allowed)
    if (parentDepth >= 2) {
      throw createError({
        statusCode: 400,
        message: 'Cannot create dependency: maximum dependency depth of 2 levels exceeded',
      })
    }
  }

  try {
    const result = await query<{
      id: number
      title: string
      status: string
      is_mit: boolean
      priority: string
      planned_date: string | null
      notes: string | null
      theme: string | null
      depends_on_task_id: number | null
      rollover_count: number
      created_at: string
      updated_at: string
    }>(
      `INSERT INTO tasks (title, status, is_mit, priority, planned_date, notes, theme, depends_on_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, status, is_mit, priority, TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date, notes, theme, depends_on_task_id, COALESCE(rollover_count, 0) as rollover_count, created_at, updated_at`,
      [
        title.trim(),
        status,
        is_mit,
        priority,
        planned_date,
        notes,
        theme?.trim() || null,
        depends_on_task_id,
      ],
    )

    // Invalidate cache when task is created
    // Clear both task cache and themes cache (new task may have new theme)
    cache.clearByPrefix('tasks:')
    cache.clearByPrefix('themes:')

    return {
      success: true,
      task: result[0],
    }
  } catch (error: unknown) {
    console.error('Failed to create task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create task',
    })
  }
})
