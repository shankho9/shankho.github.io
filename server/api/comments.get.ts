import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

interface Comment extends Record<string, unknown> {
  id: number
  post_id: string
  user_email: string
  user_name: string
  user_picture: string
  content: string
  created_at: Date
}

export default defineEventHandler(async (event) => {
  const { postId, page = '1', limit = '10' } = getQuery(event)

  if (!postId || typeof postId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'postId is required',
    })
  }

  const pageNum = parseInt(page as string, 10) || 1
  const limitNum = parseInt(limit as string, 10) || 10
  const offset = (pageNum - 1) * limitNum

  // Validate pagination parameters
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw createError({
      statusCode: 400,
      message: 'Invalid pagination parameters',
    })
  }

  try {
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM comments
       WHERE post_id = $1 AND deleted_at IS NULL`,
      [postId],
    )
    const total = parseInt(countResult[0]?.count || '0', 10)

    // Get paginated comments (newest first)
    const comments = await query<Comment>(
      `SELECT id, post_id, user_email, user_name, user_picture, content, created_at
       FROM comments
       WHERE post_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limitNum, offset],
    )

    return {
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  } catch (error: any) {
    console.error('Failed to fetch comments:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch comments',
    })
  }
})





