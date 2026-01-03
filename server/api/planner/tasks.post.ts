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
      created_at: string
      updated_at: string
    }>(
      `INSERT INTO tasks (title, status, is_mit, priority, planned_date, notes, theme)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, status, is_mit, priority, TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date, notes, theme, created_at, updated_at`,
      [title.trim(), status, is_mit, priority, planned_date, notes, theme?.trim() || null],
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
