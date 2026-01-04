import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (_event) => {
  try {
    // Delete only tasks that have been marked for deletion AND are older than 1 day
    // This matches the behavior in tasks.get which shows soft-deleted tasks for 1 day
    // Tasks deleted less than 1 day ago should still be visible and not purged
    const result = await query<{ count: number }>(
      `DELETE FROM tasks 
       WHERE deleted_at IS NOT NULL 
         AND deleted_at <= CURRENT_TIMESTAMP - INTERVAL '1 day'
       RETURNING id`,
    )

    const deletedCount = result.length

    return {
      success: true,
      deletedCount,
      message: `Purged ${deletedCount} task${deletedCount !== 1 ? 's' : ''}`,
    }
  } catch (error: unknown) {
    console.error('Failed to purge deleted tasks:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to purge deleted tasks',
    })
  }
})
