import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

interface TaskBody {
  title?: string
  status?: 'doing' | 'done'
  is_mit?: boolean
  priority?: 'high' | 'medium' | 'low'
  planned_date?: string | null
  notes?: string | null
  theme?: string | null
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

  if (updates.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update',
    })
  }

  try {
    params.push(id)
    const sql = `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} 
                 RETURNING id, title, status, is_mit, priority, TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date, notes, theme, created_at, updated_at`

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
    }>(sql, params)

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Task not found',
      })
    }

    return {
      success: true,
      task: result[0],
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
