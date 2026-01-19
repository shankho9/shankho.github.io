import { defineEventHandler, getRouterParam, getQuery } from 'h3'
import { query } from '~/server/utils/db'
import { cache } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(parseInt(id, 10))) {
    throw createError({
      statusCode: 400,
      message: 'Valid task ID is required',
    })
  }

  const taskId = parseInt(id, 10)

  // Use query parameter instead of body for DELETE requests (HTTP standard)
  // This ensures compatibility across all HTTP clients, proxies, and servers
  const queryParams = getQuery(event)
  const shouldArchive = queryParams.archive === 'true' || queryParams.archive === true

  try {
    // Get the task's parent (grandfather) if it exists
    const taskInfo = await query<{ depends_on_task_id: number | null }>(
      `SELECT depends_on_task_id FROM tasks WHERE id = $1`,
      [taskId],
    )

    if (taskInfo.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Task not found',
      })
    }

    const grandfatherId = taskInfo[0].depends_on_task_id

    // Check if task has dependent tasks (children) - if so, reassign them
    const dependentTasks = await query<{ id: number; title: string }>(
      `SELECT id, title FROM tasks 
       WHERE depends_on_task_id = $1 AND deleted_at IS NULL`,
      [taskId],
    )

    if (dependentTasks.length > 0) {
      // If this task has a parent (grandfather), attach children to grandfather
      // Otherwise, make children independent
      if (grandfatherId !== null) {
        // Verify that the grandfather task still exists and is valid
        const grandfatherCheck = await query<{ id: number }>(
          `SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL`,
          [grandfatherId],
        )

        if (grandfatherCheck.length > 0) {
          // Grandfather exists and is valid - attach all child tasks to the grandfather
          await query(
            `UPDATE tasks 
             SET depends_on_task_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE depends_on_task_id = $2 AND deleted_at IS NULL`,
            [grandfatherId, taskId],
          )
        } else {
          // Grandfather doesn't exist or is deleted - make children independent
          await query(
            `UPDATE tasks 
             SET depends_on_task_id = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE depends_on_task_id = $1 AND deleted_at IS NULL`,
            [taskId],
          )
        }
      } else {
        // Make all child tasks independent by removing their dependency
        await query(
          `UPDATE tasks 
           SET depends_on_task_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE depends_on_task_id = $1 AND deleted_at IS NULL`,
          [taskId],
        )
      }
    }
    if (shouldArchive) {
      // Close and archive: Mark as done, archive it, then mark for deletion
      // First, get the task data
      const taskResult = await query<{
        id: number
        title: string
        status: string
        is_mit: boolean
        priority: string
        planned_date: string | null
        notes: string | null
        theme: string | null
        created_at: string
        updated_at: string
      }>(
        `SELECT id, title, status, is_mit, priority, 
         TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date,
         notes, theme, created_at, updated_at
         FROM tasks WHERE id = $1`,
        [taskId],
      )

      if (taskResult.length === 0) {
        throw createError({
          statusCode: 404,
          message: 'Task not found',
        })
      }

      const task = taskResult[0]

      // Insert into archive table
      await query(
        `INSERT INTO tasks_archive 
         (original_task_id, title, status, is_mit, priority, planned_date, notes, theme, 
          completed_at, archived_at, created_at, updated_at)
         VALUES ($1, $2, 'done', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $8, $9)`,
        [
          task.id,
          task.title,
          task.is_mit,
          task.priority,
          task.planned_date,
          task.notes,
          task.theme,
          task.created_at,
          task.updated_at,
        ],
      )

      // Hard delete the task
      await query(`DELETE FROM tasks WHERE id = $1`, [taskId])

      // Invalidate cache when task is deleted/archived
      cache.clearByPrefix('tasks:')

      return {
        success: true,
        message: 'Task closed and archived successfully',
        archived: true,
      }
    } else {
      // Delete only: hard delete without archiving
      const result = await query<{ id: number }>(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [
        taskId,
      ])

      if (result.length === 0) {
        throw createError({
          statusCode: 404,
          message: 'Task not found',
        })
      }

      // Invalidate cache when task is deleted
      cache.clearByPrefix('tasks:')
      cache.clearByPrefix('themes:')

      return {
        success: true,
        message: 'Task deleted successfully',
        archived: false,
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Failed to delete task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete task',
    })
  }
})
