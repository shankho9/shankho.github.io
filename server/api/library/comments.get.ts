import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'
import {
  parseLibraryEngagementKind,
  toLibraryPostId,
} from '~/server/utils/libraryEngagementService'

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
  const { itemId, kind: kindRaw, page = '1', limit = '10' } = getQuery(event)

  if (!itemId || typeof itemId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'itemId is required',
    })
  }

  const kind = parseLibraryEngagementKind(kindRaw, 'gallery')
  const postId = toLibraryPostId(kind, itemId)

  const pageNum = parseInt(page as string, 10) || 1
  const limitNum = parseInt(limit as string, 10) || 10
  const offset = (pageNum - 1) * limitNum

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw createError({
      statusCode: 400,
      message: 'Invalid pagination parameters',
    })
  }

  try {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM comments
       WHERE post_id = $1 AND deleted_at IS NULL`,
      [postId],
    )
    const total = parseInt(countResult[0]?.count || '0', 10)

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
  } catch (error: unknown) {
    console.error('Failed to fetch library comments:', error)

    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        return {
          comments: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
        }
      }
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch comments',
    })
  }
})
