import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { itemId } = getQuery(event)

  if (!itemId || typeof itemId !== 'string') {
    return {
      success: false,
      count: 0,
      isLiked: false,
      error: 'Missing or invalid itemId',
    }
  }

  // Use gallery_ prefix
  const postId = `gallery_${itemId}`

  try {
    // Get like count
    const countRows = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND deleted_at IS NULL',
      [postId],
    )

    const count = parseInt(countRows[0]?.count ?? '0', 10)

    // Check if current user has liked (using IP as identifier)
    const userIp = event.node.req.socket.remoteAddress || ''
    const forwarded = event.node.req.headers['x-forwarded-for']
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || userIp

    const likeRows = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND user_ip = $2 AND deleted_at IS NULL',
      [postId, ip],
    )

    const isLiked = parseInt(likeRows[0]?.count ?? '0', 10) > 0

    return {
      success: true,
      count,
      isLiked,
    }
  } catch (error: unknown) {
    console.error('[API] Failed to get gallery like count:', error)

    return {
      success: false,
      count: 0,
      isLiked: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
