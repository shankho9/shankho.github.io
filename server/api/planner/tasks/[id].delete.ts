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

      // Mark task as archived and set deleted_at
      await query(
        `UPDATE tasks 
         SET status = 'done', is_archived = true, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [taskId],
      )

      // Invalidate cache when task is deleted/archived
      // Only clear task-related cache, preserve themes cache
      cache.clearByPrefix('tasks:')

      return {
        success: true,
        message: 'Task closed and archived successfully',
        archived: true,
      }
    } else {
      // Direct delete: Just mark for deletion (will be purged after 1 day)
      const result = await query<{ id: number }>(
        `UPDATE tasks 
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [taskId],
      )

      if (result.length === 0) {
        // Check if task exists but is already deleted
        const checkResult = await query<{ id: number }>('SELECT id FROM tasks WHERE id = $1', [
          taskId,
        ])

        if (checkResult.length === 0) {
          throw createError({
            statusCode: 404,
            message: 'Task not found',
          })
        }

        // Task exists but already marked for deletion
        return {
          success: true,
          message: 'Task already marked for deletion',
          archived: false,
        }
      }

      // Invalidate cache when task is deleted
      // Clear both task cache and themes cache (theme list may change)
      cache.clearByPrefix('tasks:')
      cache.clearByPrefix('themes:')

      return {
        success: true,
        message: 'Task marked for deletion (will be removed after 1 day)',
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
