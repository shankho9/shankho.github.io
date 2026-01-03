import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (_event) => {
  try {
    // Delete all tasks that have been marked for deletion (deleted_at is set)
    const result = await query<{ count: number }>(
      `DELETE FROM tasks 
       WHERE deleted_at IS NOT NULL 
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
