import { defineEventHandler, readBody } from 'h3'
import { withTransaction } from '~/server/utils/db'
import type { PoolClient } from 'pg'

/**
 * Comment Reactions API Endpoint
 *
 * This endpoint stores comment reactions with user details (name, email, picture).
 * The database connection uses DATABASE_URL from environment variables:
 * - Local development: .env file
 * - Production: .env.production file or environment variables
 *
 * User details are stored when reactions are created/updated to preserve
 * the user's information at the time of reaction, even if their profile changes later.
 */

interface ReactionBody {
  commentId: number
  reactionType: 'thumbs_up' | 'heart' | 'party' | 'rocket' | 'eyes'
  userEmail: string
  userName?: string
  userPicture?: string
  action: 'add' | 'remove'
}

const VALID_REACTIONS = ['thumbs_up', 'heart', 'party', 'rocket', 'eyes']

export default defineEventHandler(async (event) => {
  const body = await readBody<ReactionBody>(event)
  const { commentId, reactionType, userEmail, userName, userPicture, action } = body

  // Use explicit null/undefined checks to allow commentId of 0
  if (commentId == null || commentId === undefined || !reactionType || !userEmail || !action) {
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
    // Wrap all database operations in a transaction to prevent race conditions
    const result = await withTransaction(async (client: PoolClient) => {
      if (action === 'add') {
        // First, remove any existing reaction from this user for this comment
        // (since we only allow one reaction per user per comment)
        await client.query(
          `DELETE FROM comment_reactions
           WHERE comment_id = $1 AND user_email = $2`,
          [commentId, userEmail],
        )

        // Then insert the new reaction with user details
        // Ensure user_name and user_picture are properly set (trim and validate)
        const cleanUserName = userName?.trim() || null
        const cleanUserPicture = userPicture?.trim() || null

        await client.query(
          `INSERT INTO comment_reactions (comment_id, user_email, reaction_type, user_name, user_picture)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (comment_id, user_email) DO UPDATE
           SET reaction_type = EXCLUDED.reaction_type,
               user_name = COALESCE(EXCLUDED.user_name, comment_reactions.user_name),
               user_picture = COALESCE(EXCLUDED.user_picture, comment_reactions.user_picture),
               created_at = CURRENT_TIMESTAMP`,
          [commentId, userEmail, reactionType, cleanUserName, cleanUserPicture],
        )
      } else {
        // Remove reaction
        await client.query(
          `DELETE FROM comment_reactions
           WHERE comment_id = $1 AND user_email = $2`,
          [commentId, userEmail],
        )
      }

      // Get updated reaction counts for this comment (within the same transaction)
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

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning error')
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
