import { createError, defineEventHandler, readBody } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { withTransaction } from '~/server/utils/db'
import type { PoolClient } from 'pg'

interface ReactionBody {
  commentId: number
  reactionType: 'thumbs_up' | 'heart' | 'party' | 'rocket' | 'eyes'
  action: 'add' | 'remove'
}

const VALID_REACTIONS = ['thumbs_up', 'heart', 'party', 'rocket', 'eyes']

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody<ReactionBody>(event)
  const { commentId, reactionType, action } = body

  if (commentId == null || commentId === undefined || !reactionType || !action) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields',
    })
  }

  if (!VALID_REACTIONS.includes(reactionType)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid reaction type',
    })
  }

  if (action !== 'add' && action !== 'remove') {
    throw createError({
      statusCode: 400,
      message: 'Invalid action (must be "add" or "remove")',
    })
  }

  const userEmail = user.email
  const userName = user.name?.trim() || null
  const userPicture = user.picture?.trim() || null

  try {
    const result = await withTransaction(async (client: PoolClient) => {
      if (action === 'add') {
        await client.query(`DELETE FROM comment_reactions WHERE comment_id = $1 AND user_email = $2`, [
          commentId,
          userEmail,
        ])

        await client.query(
          `INSERT INTO comment_reactions (comment_id, user_email, reaction_type, user_name, user_picture)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (comment_id, user_email) DO UPDATE
           SET reaction_type = EXCLUDED.reaction_type,
               user_name = COALESCE(EXCLUDED.user_name, comment_reactions.user_name),
               user_picture = COALESCE(EXCLUDED.user_picture, comment_reactions.user_picture),
               created_at = CURRENT_TIMESTAMP`,
          [commentId, userEmail, reactionType, userName, userPicture],
        )
      } else {
        await client.query(`DELETE FROM comment_reactions WHERE comment_id = $1 AND user_email = $2`, [
          commentId,
          userEmail,
        ])
      }

      const countsResult = await client.query<{
        reaction_type: string
        count: string
      }>(
        `SELECT reaction_type, COUNT(*) as count
         FROM comment_reactions
         WHERE comment_id = $1
         GROUP BY reaction_type`,
        [commentId],
      )

      const reactions: Record<string, number> = {}
      countsResult.rows.forEach((row) => {
        reactions[row.reaction_type] = parseInt(row.count, 10)
      })

      return {
        success: true,
        reactions,
      }
    })

    return result
  } catch (error: unknown) {
    console.error('Failed to update comment reaction:', error)

    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        throw createError({
          statusCode: 503,
          message: 'Database connection timeout. Please try again in a moment.',
        })
      }
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to update comment reaction',
    })
  }
})
