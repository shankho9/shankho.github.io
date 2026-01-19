import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { query } from '~/server/utils/db'
import { cache } from '~/server/utils/cache'

interface TaskBody {
  title?: string
  status?: 'doing' | 'done'
  is_mit?: boolean
  priority?: 'high' | 'medium' | 'low'
  planned_date?: string | null
  notes?: string | null
  theme?: string | null
  depends_on_task_id?: number | null
  estimated_time_minutes?: number | null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<TaskBody>(event)

  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({
      statusCode: 400,
      message: 'Valid task ID is required',
    })
  }

  // Build dynamic update query
  const updates: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Title cannot be empty',
      })
    }
    if (body.title.length > 500) {
      throw createError({
        statusCode: 400,
        message: 'Title is too long (max 500 characters)',
      })
    }
    updates.push(`title = $${paramIndex}`)
    params.push(body.title.trim())
    paramIndex++
  }

  if (body.status !== undefined) {
    updates.push(`status = $${paramIndex}`)
    params.push(body.status)
    paramIndex++
  }

  if (body.is_mit !== undefined) {
    updates.push(`is_mit = $${paramIndex}`)
    params.push(body.is_mit)
    paramIndex++
  }

  if (body.priority !== undefined) {
    updates.push(`priority = $${paramIndex}`)
    params.push(body.priority)
    paramIndex++
  }

  if (body.planned_date !== undefined) {
    updates.push(`planned_date = $${paramIndex}::date`)
    // Convert empty string to null, otherwise use the date string as-is
    params.push(body.planned_date === '' ? null : body.planned_date)
    paramIndex++
  }

  if (body.notes !== undefined) {
    updates.push(`notes = $${paramIndex}`)
    params.push(body.notes)
    paramIndex++
  }

  if (body.theme !== undefined) {
    updates.push(`theme = $${paramIndex}`)
    params.push(body.theme?.trim() || null)
    paramIndex++
  }

  if (body.depends_on_task_id !== undefined) {
    // Validate depends_on_task_id if provided
    if (body.depends_on_task_id !== null) {
      // Prevent self-dependency
      if (body.depends_on_task_id === parseInt(id, 10)) {
        throw createError({
          statusCode: 400,
          message: 'Task cannot depend on itself',
        })
      }
      // Check if parent task exists and is not completed
      const parentTask = await query<{ id: number; status: string; theme: string | null }>(
        'SELECT id, status, theme FROM tasks WHERE id = $1 AND deleted_at IS NULL',
        [body.depends_on_task_id],
      )
      if (parentTask.length === 0) {
        throw createError({
          statusCode: 400,
          message: 'Parent task not found',
        })
      }
      // Reject dependencies on completed tasks - they serve no purpose
      if (parentTask[0].status === 'done') {
        throw createError({
          statusCode: 400,
          message: 'Cannot create dependency on a completed task',
        })
      }
      // Ensure parent task is in the same bucket (theme) as the current task
      // Get the current task's theme (or the new theme if it's being updated)
      const currentTaskId = parseInt(id, 10)
      const currentTask = await query<{ theme: string | null }>(
        'SELECT theme FROM tasks WHERE id = $1 AND deleted_at IS NULL',
        [currentTaskId],
      )
      if (currentTask.length === 0) {
        throw createError({
          statusCode: 404,
          message: 'Task not found',
        })
      }
      // Use the new theme if provided, otherwise use the current task's theme
      const taskTheme =
        body.theme !== undefined ? body.theme?.trim() || null : currentTask[0].theme?.trim() || null
      const parentTheme = parentTask[0].theme?.trim() || null
      if (parentTheme !== taskTheme) {
        throw createError({
          statusCode: 400,
          message:
            'Cannot create dependency: parent task must be in the same bucket (theme) as the dependent task',
        })
      }

      // Prevent circular dependencies and check depth
      // Check if the parent task (or any of its ancestors) depends on this task
      const visitedTaskIds = new Set<number>([currentTaskId])
      let checkTaskId = body.depends_on_task_id
      let parentDepth = 0

      // Traverse the dependency chain to detect cycles and calculate parent depth
      // parentDepth counts how many parents the new parent task has (its depth in the chain)
      // For a level 0 task: parentDepth = 0 (no parents)
      // For a level 1 task: parentDepth = 1 (has one parent)
      // For a level 2 task: parentDepth = 2 (has grandparent)
      while (checkTaskId !== null && parentDepth < 3) {
        if (visitedTaskIds.has(checkTaskId)) {
          // Found a cycle - this would create a circular dependency
          throw createError({
            statusCode: 400,
            message: 'Circular dependency detected: this would create a dependency cycle',
          })
        }

        visitedTaskIds.add(checkTaskId)

        // Get the task that checkTaskId depends on
        const ancestorTask = await query<{ depends_on_task_id: number | null }>(
          'SELECT depends_on_task_id FROM tasks WHERE id = $1 AND deleted_at IS NULL',
          [checkTaskId],
        )

        if (ancestorTask.length === 0) {
          // Task not found, break the chain
          break
        }

        // If the current task has no dependency, we've reached the root
        if (ancestorTask[0].depends_on_task_id === null) {
          // checkTaskId has no parent, so we've counted all levels up to this point
          break
        }

        // Move up one level and increment depth (we found one more level in the chain)
        // parentDepth represents how many levels deep checkTaskId is
        checkTaskId = ancestorTask[0].depends_on_task_id
        parentDepth++
      }

      // Note: parentDepth now represents the depth of the new parent task
      // If new parent is level 1 (has 1 parent), parentDepth = 1
      // If new parent is level 0 (has 0 parents), parentDepth = 0

      // Check dependency depth - allow max 2 levels (0 -> 1 -> 2)
      // Calculate what the new depth would be: parent depth + 1 (for the new link)
      // parentDepth is the depth of the new parent task (0 for level 0, 1 for level 1, 2 for level 2)
      // newDepth is what the current task's depth would be after the change
      const newDepth = parentDepth + 1

      // Max allowed depth is 2
      if (newDepth > 2) {
        throw createError({
          statusCode: 400,
          message: `Cannot create dependency: maximum dependency depth of 2 levels exceeded (new depth would be ${newDepth}, parent depth is ${parentDepth})`,
        })
      }

      // Check if current task has dependents that would be affected
      // If current task has dependents, we need to ensure changing its dependency
      // won't break the chain for its dependents
      const currentTaskDependents = await query<{ id: number }>(
        'SELECT id FROM tasks WHERE depends_on_task_id = $1 AND deleted_at IS NULL',
        [currentTaskId],
      )

      if (currentTaskDependents.length > 0) {
        // Current task has dependents - check if any would exceed depth 2
        // Calculate depth of current task with new dependency
        const currentTaskNewDepth = newDepth

        // Check each dependent's depth would be currentTaskNewDepth + 1
        // If any dependent would be at depth > 2, reject
        for (const _dependent of currentTaskDependents) {
          // Calculate dependent's depth: currentTaskNewDepth + 1
          const dependentDepth = currentTaskNewDepth + 1
          if (dependentDepth > 2) {
            throw createError({
              statusCode: 400,
              message: `Cannot change dependency: this would cause dependent task(s) to exceed maximum depth of 2 levels`,
            })
          }
        }
      }
    }
    updates.push(`depends_on_task_id = $${paramIndex}`)
    params.push(body.depends_on_task_id)
    paramIndex++
  }

  if (updates.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update',
    })
  }

  try {
    // Get original task status before update to check if this is a transition to 'done'
    let originalStatus: string | null = null
    if (body.status === 'done') {
      const originalTask = await query<{ status: string }>(
        'SELECT status FROM tasks WHERE id = $1 AND deleted_at IS NULL',
        [id],
      )
      if (originalTask.length === 0) {
        // Task not found - this will also cause UPDATE to fail, but we handle it explicitly here
        throw createError({
          statusCode: 404,
          message: 'Task not found',
        })
      }
      originalStatus = originalTask[0].status
    }

    params.push(id)
    const sql = `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} 
                 RETURNING id, title, status, is_mit, priority, TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date, notes, theme, depends_on_task_id, COALESCE(rollover_count, 0) as rollover_count, created_at, updated_at`

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
    }>(sql, params)

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Task not found',
      })
    }

    const updatedTask = result[0]

    // Auto-activate dependent tasks when parent task is completed
    // Only activate if this was a transition from 'doing' to 'done' (not if it was already 'done')
    // Verify that originalStatus was successfully retrieved before checking it
    if (
      body.status === 'done' &&
      updatedTask.status === 'done' &&
      originalStatus !== null &&
      originalStatus === 'doing'
    ) {
      // Find all tasks that depend on this task that are not already 'done'
      // These tasks should be activated now that the parent is complete
      const dependentTasks = await query<{ id: number; status: string }>(
        'SELECT id, status FROM tasks WHERE depends_on_task_id = $1 AND status != $2 AND deleted_at IS NULL',
        [id, 'done'], // Find all dependent tasks that are not already 'done'
      )

      // Activate dependent tasks by setting them to 'doing' status
      // This makes them available for work now that the parent is complete
      if (dependentTasks.length > 0) {
        await query(
          'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE depends_on_task_id = $2 AND status != $3 AND deleted_at IS NULL',
          ['doing', id, 'done'], // Activate all non-done dependent tasks
        )
      }
    }

    // Invalidate cache when task is updated
    // Clear both task cache and themes cache (theme may have changed)
    cache.clearByPrefix('tasks:')
    cache.clearByPrefix('themes:')

    return {
      success: true,
      task: updatedTask,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Failed to update task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update task',
    })
  }
})
