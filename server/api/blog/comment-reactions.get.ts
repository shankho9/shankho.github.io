import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

interface UserReaction {
  comment_id: number
  reaction_type: string
}

export default defineEventHandler(async (event) => {
  const { commentIds, userEmail } = getQuery(event)

  if (!commentIds) {
    throw createError({
      statusCode: 400,
      message: 'commentIds is required',
    })
  }

  // Parse commentIds (can be comma-separated string or array)
  const commentIdArray = Array.isArray(commentIds)
    ? commentIds.map((id) => parseInt(String(id), 10))
    : String(commentIds)
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id))

  if (commentIdArray.length === 0) {
    return {
      reactions: {},
      userReactions: {},
    }
  }

  try {
    // Get reaction counts for all comments
    const reactionsResult = await query<{
      comment_id: number
      reaction_type: string
      count: string
    }>(
      `SELECT comment_id, reaction_type, COUNT(*) as count
       FROM comment_reactions
       WHERE comment_id = ANY($1::int[])
       GROUP BY comment_id, reaction_type`,
      [commentIdArray],
    )

    // Build reactions object: { commentId: { reactionType: count } }
    const reactions: Record<number, Record<string, number>> = {}
    reactionsResult.forEach((row) => {
      if (!reactions[row.comment_id]) {
        reactions[row.comment_id] = {}
      }
      reactions[row.comment_id][row.reaction_type] = parseInt(row.count, 10)
    })

    // Get user's reactions if userEmail is provided
    // Since we only allow one reaction per user per comment, return a single reaction type
    const userReactions: Record<number, string[]> = {}
    if (userEmail && typeof userEmail === 'string') {
      const userReactionsResult = await query<UserReaction>(
        `SELECT comment_id, reaction_type
         FROM comment_reactions
         WHERE comment_id = ANY($1::int[]) AND user_email = $2`,
        [commentIdArray, userEmail],
      )

      userReactionsResult.forEach((row) => {
        // Store as array with single element for compatibility with frontend
        // Frontend expects array but will only use the first element
        userReactions[row.comment_id] = [row.reaction_type]
      })
    }

    return {
      reactions,
      userReactions,
    }
  } catch (error: unknown) {
    console.error('Failed to fetch comment reactions:', error)

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning empty reactions')
        return {
          reactions: {},
          userReactions: {},
        }
      }
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch comment reactions',
    })
  }
})
