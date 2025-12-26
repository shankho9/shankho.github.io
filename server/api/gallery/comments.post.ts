import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

interface CommentBody {
  itemId: string
  content: string
  userEmail: string
  userName: string
  userPicture: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CommentBody>(event)
  const { itemId, content, userEmail, userName, userPicture } = body

  if (!itemId || !content || !userEmail || !userName) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    })
  }

  if (content.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Comment cannot be empty',
    })
  }

  if (content.length > 5000) {
    throw createError({
      statusCode: 400,
      message: 'Comment is too long (max 5000 characters)',
    })
  }

  // Use gallery_ prefix
  const postId = `gallery_${itemId}`

  try {
    const result = await query<{ id: number }>(
      `INSERT INTO comments (post_id, user_email, user_name, user_picture, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [postId, userEmail, userName, userPicture || '', content.trim()],
    )

    return {
      success: true,
      comment: {
        id: result[0].id,
        post_id: postId,
        user_email: userEmail,
        user_name: userName,
        user_picture: userPicture || '',
        content: content.trim(),
        created_at: new Date(),
      },
    }
  } catch (error: unknown) {
    console.error('Failed to create gallery comment:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create comment',
    })
  }
})
