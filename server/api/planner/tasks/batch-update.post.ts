import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'
import { cache } from '~/server/utils/cache'

interface BatchUpdateItem {
  id: number
  planned_date: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ updates: BatchUpdateItem[] }>(event)

  if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Updates array is required',
    })
  }

  try {
    // Use a single query to update all tasks at once
    // This is much more efficient than multiple parallel queries
    if (body.updates.length === 0) {
      return { success: true, updated: 0 }
    }

    // All updates should have the same date (today) from rollOverPastDates
    const ids = body.updates.map((u) => u.id)
    const dateValue = body.updates[0].planned_date

    // Use a single UPDATE with WHERE IN clause
    // This uses only ONE database connection instead of N connections
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const dateParamIndex = ids.length + 1
    const result = await query<{ id: number }>(
      `UPDATE tasks 
       SET planned_date = $${dateParamIndex}::date, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) 
         AND status = 'doing'
       RETURNING id`,
      [...ids, dateValue],
    )

    // Invalidate cache
    // Clear task cache (themes unlikely to change in batch date updates, but clear for safety)
    cache.clearByPrefix('tasks:')

    return {
      success: true,
      updated: result.length,
    }
  } catch (error: unknown) {
    console.error('Failed to batch update tasks:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to batch update tasks',
    })
  }
})
