import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

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
  created_at: string
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const { status, date, priority, theme } = getQuery(event)

  try {
    let sql = `SELECT id, title, status, is_mit, priority, 
               TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date,
               notes, theme, created_at, updated_at 
               FROM tasks WHERE 1=1`
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

    const tasks = await query<Task>(sql, params)

    return { tasks }
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
