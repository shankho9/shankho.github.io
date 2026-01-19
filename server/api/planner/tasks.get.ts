import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'
import { cache } from '~/server/utils/cache'

export type TaskStatus = 'doing' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: number
  title: string
  status: TaskStatus
  is_mit: boolean
  priority: TaskPriority
  planned_date: string | null
  notes: string | null
  theme: string | null
  depends_on_task_id: number | null
  rollover_count: number
  created_at: string
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const { status, date, priority, theme } = getQuery(event)

  // Create cache key from query parameters
  // Important: getQuery() returns strings or undefined, never null
  // - theme === undefined: no theme filter (show all themes)
  // - theme === '': explicit empty string from ?theme= (filter for theme IS NULL)
  // - theme === 'somevalue': specific theme filter
  // We must distinguish these to avoid cache key collisions
  // Also handle empty strings for status, date, priority to avoid collisions
  const statusKey = status && typeof status === 'string' && status.trim() ? status : 'all'
  const dateKey = date && typeof date === 'string' && date.trim() ? date : 'all'
  const priorityKey = priority && typeof priority === 'string' && priority.trim() ? priority : 'all'
  let themeKey: string
  if (theme === undefined) {
    themeKey = '__undefined__' // No theme filter (use prefix to avoid collision with theme named 'all')
  } else if (theme === '') {
    themeKey = '__empty__' // Explicit empty string from ?theme= (filter for theme IS NULL)
  } else {
    themeKey = String(theme) // Specific theme value (including 'all' if that's the theme name)
  }
  const cacheKey = `tasks:${statusKey}:${dateKey}:${priorityKey}:${themeKey}`

  // Check cache first (30 second TTL for tasks)
  const cached = cache.get<{ tasks: Task[] }>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Exclude archived tasks. Legacy rows with deleted_at set are also excluded.
    let sql = `SELECT id, title, status, is_mit, priority, 
               TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date,
               notes, theme, depends_on_task_id, 
               COALESCE(rollover_count, 0) as rollover_count,
               created_at, updated_at 
               FROM tasks 
               WHERE deleted_at IS NULL
               AND (is_archived IS NULL OR is_archived = false)`
    const params: unknown[] = []
    let paramIndex = 1

    if (status && typeof status === 'string') {
      sql += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (date && typeof date === 'string') {
      sql += ` AND planned_date = $${paramIndex}`
      params.push(date)
      paramIndex++
    }

    if (priority && typeof priority === 'string') {
      sql += ` AND priority = $${paramIndex}`
      params.push(priority)
      paramIndex++
    }

    if (theme !== undefined) {
      if (theme === null || theme === '') {
        sql += ` AND theme IS NULL`
      } else if (typeof theme === 'string') {
        sql += ` AND theme = $${paramIndex}`
        params.push(theme)
        paramIndex++
      }
    }

    sql += ' ORDER BY theme NULLS LAST, is_mit DESC, priority DESC, created_at ASC'

    // Limit results to prevent loading too many tasks at once (performance optimization)
    // Only apply limit if no specific filters are set (when loading all tasks)
    // Check for truthy string values (not empty strings) and undefined
    const hasStatusFilter = status && typeof status === 'string' && status.trim()
    const hasDateFilter = date && typeof date === 'string' && date.trim()
    const hasPriorityFilter = priority && typeof priority === 'string' && priority.trim()
    const hasThemeFilter = theme !== undefined // theme can be empty string, which is still a filter

    if (!hasStatusFilter && !hasDateFilter && !hasPriorityFilter && !hasThemeFilter) {
      sql += ' LIMIT 1000' // Reasonable limit for dashboard/manage tasks view
    }

    const tasks = await query<Task>(sql, params)

    const result = { tasks }

    // Cache the result for 30 seconds
    cache.set(cacheKey, result, 30000)

    return result
  } catch (error: unknown) {
    console.error('Failed to fetch tasks:', error)

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning empty tasks')
        // Return empty tasks instead of failing completely
        return { tasks: [] }
      }
    }

    // For other errors, still throw to maintain error handling
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch tasks',
    })
  }
})
