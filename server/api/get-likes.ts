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
      'SELECT COUNT(*) FROM likes WHERE post_id = $1 AND deleted_at IS NULL',
      [postId],
    )

    const count = parseInt(rows[0]?.count ?? '0', 10)

    return {
      success: true,
      count,
    }
  } catch (error: unknown) {
    console.error('Count error:', error)

    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
