import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

interface ReactionBody {
  commentId: number
  reactionType: 'thumbs_up' | 'heart' | 'party' | 'rocket' | 'eyes'
  userEmail: string
  action: 'add' | 'remove'
}

const VALID_REACTIONS = ['thumbs_up', 'heart', 'party', 'rocket', 'eyes']

export default defineEventHandler(async (event) => {
  const body = await readBody<ReactionBody>(event)
  const { commentId, reactionType, userEmail, action } = body

  if (!commentId || !reactionType || !userEmail || !action) {
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

  try {
    if (action === 'add') {
      // Insert reaction (ON CONFLICT DO NOTHING to handle duplicates gracefully)
      await query(
        `INSERT INTO comment_reactions (comment_id, user_email, reaction_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (comment_id, user_email, reaction_type) DO NOTHING`,
        [commentId, userEmail, reactionType],
      )
    } else {
      // Remove reaction
      await query(
        `DELETE FROM comment_reactions
         WHERE comment_id = $1 AND user_email = $2 AND reaction_type = $3`,
        [commentId, userEmail, reactionType],
      )
    }

    // Get updated reaction counts for this comment
    const countsResult = await query<{
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
    countsResult.forEach((row) => {
      reactions[row.reaction_type] = parseInt(row.count, 10)
    })

    return {
      success: true,
      reactions,
    }
  } catch (error: unknown) {
    console.error('Failed to update comment reaction:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update comment reaction',
    })
  }
})
