// server/api/like.ts
import { readBody, defineEventHandler, getHeader } from 'h3'
import { query } from '~/server/utils/db'
import { getClientIP } from '~/server/utils/getClientIP'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { postId, action } = body

  // Validate incoming data
  if (!postId || !['like', 'unlike'].includes(action)) {
    return { success: false, message: 'Missing or invalid postId/action' }
  }

  // Collect metadata
  const userIp = getClientIP(event)
  const userAgent = getHeader(event, 'user-agent') || 'unknown'

  try {
    if (action === 'like') {
      // Insert or revive like (soft undelete if already exists)
      await query(
        `
        INSERT INTO likes (post_id, user_ip, user_agent, deleted_at)
        VALUES ($1, $2, $3, NULL)
        ON CONFLICT (post_id, user_ip) DO UPDATE
        SET deleted_at = NULL,
            user_agent = EXCLUDED.user_agent
        `,
        [postId, userIp, userAgent],
      )
    } else if (action === 'unlike') {
      // Soft delete the like
      await query(`UPDATE likes SET deleted_at = NOW() WHERE post_id = $1 AND user_ip = $2`, [
        postId,
        userIp,
      ])
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Like error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
