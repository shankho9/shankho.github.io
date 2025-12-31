// server/api/get-likes.ts
import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { postId } = getQuery(event)

  if (!postId || typeof postId !== 'string') {
    return {
      success: false,
      count: 0,
      error: 'Missing or invalid postId',
    }
  }

  try {
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND deleted_at IS NULL',
      [postId],
    )

    const count = parseInt(rows[0]?.count ?? '0', 10)

    return {
      success: true,
      count,
    }
  } catch (error: unknown) {
    console.error('[API] Failed to get like count:', error)

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning default count')
        // Return default values instead of failing completely
        return {
          success: false,
          count: 0,
          error: 'Database connection timeout',
        }
      }
    }

    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
