import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

/**
 * Get real-time visitor count for a page
 * Returns count of unique visitors in the last hour
 */
export default defineEventHandler(async (event) => {
  const { page = '/' } = getQuery(event)

  try {
    // Get unique visitors in the last hour
    const result = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT ip_address) as count
       FROM page_visits
       WHERE page = $1
         AND created_at >= NOW() - INTERVAL '1 hour'`,
      [page],
    )

    return {
      count: parseInt(result[0]?.count || '0', 10),
    }
  } catch (error: unknown) {
    // If table doesn't exist, return 0
    if (error instanceof Error && error.message.includes('does not exist')) {
      return { count: 0 }
    }

    console.error('[Analytics] Failed to fetch visitor count:', error)
    return { count: 0 }
  }
})
