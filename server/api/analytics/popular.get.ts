import { defineEventHandler, getQuery } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

/**
 * Get popular posts analytics
 * Returns posts sorted by views, likes, comments, reading time, etc.
 */
export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized' }
  }

  const { limit = 10, period = '30' } = getQuery(event)
  const limitNum = parseInt(String(limit), 10)
  const periodDays = parseInt(String(period), 10)

  try {
    // Get popular posts based on page visits
    const popularByVisits = await query<{
      page: string
      visit_count: number
      unique_visitors: number
    }>(
      `SELECT 
        page,
        COUNT(*) as visit_count,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM page_visits
      WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
        AND page LIKE '/blogs/%'
      GROUP BY page
      ORDER BY visit_count DESC, unique_visitors DESC
      LIMIT $1`,
      [limitNum],
    )

    // Get popular posts by likes (if likes table exists)
    let popularByLikes: Array<{ post_id: string; like_count: number }> = []
    try {
      popularByLikes = await query<{
        post_id: string
        like_count: number
      }>(
        `SELECT 
          post_id,
          COUNT(*) as like_count
        FROM blog_likes
        WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
        GROUP BY post_id
        ORDER BY like_count DESC
        LIMIT $1`,
        [limitNum],
      )
    } catch {
      // Likes table might not exist, skip
      console.warn('[Analytics] blog_likes table does not exist')
    }

    // Get popular posts by comments
    let popularByComments: Array<{ post_id: string; comment_count: number }> = []
    try {
      popularByComments = await query<{
        post_id: string
        comment_count: number
      }>(
        `SELECT 
          post_id,
          COUNT(*) as comment_count
        FROM comments
        WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
        GROUP BY post_id
        ORDER BY comment_count DESC
        LIMIT $1`,
        [limitNum],
      )
    } catch {
      // Comments table might not exist, skip
      console.warn('[Analytics] comments table does not exist')
    }

    // Get average reading time by post
    let readingTimeStats: Array<{ page: string; avg_duration: number; avg_completion: number }> = []
    try {
      readingTimeStats = await query<{
        page: string
        avg_duration: number
        avg_completion: number
      }>(
        `SELECT 
          page,
          AVG(duration) as avg_duration,
          AVG(CASE WHEN estimated_reading_time > 0 
            THEN (duration / (estimated_reading_time * 60)) * 100 
            ELSE 0 END) as avg_completion
        FROM reading_time
        WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
          AND page LIKE '/blogs/%'
        GROUP BY page
        ORDER BY avg_duration DESC
        LIMIT $1`,
        [limitNum],
      )
    } catch {
      // Reading time table might not exist, skip
      console.warn('[Analytics] reading_time table does not exist')
    }

    return {
      success: true,
      period: `${periodDays} days`,
      popularByVisits: popularByVisits || [],
      popularByLikes: popularByLikes || [],
      popularByComments: popularByComments || [],
      readingTimeStats: readingTimeStats || [],
    }
  } catch (error) {
    console.error('[Analytics] Failed to fetch popular posts:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch popular posts',
    }
  }
})
