import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

/**
 * Track scroll depth analytics
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { page, depth, timestamp } = body

  if (!page || typeof depth !== 'number') {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: page, depth',
    })
  }

  try {
    // Store scroll depth data
    // Note: You may need to create a scroll_depth table if it doesn't exist
    await query(
      `INSERT INTO scroll_depth (page, depth, created_at)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))
       ON CONFLICT DO NOTHING`,
      [page, depth, timestamp || Date.now()],
    )

    return { success: true }
  } catch (error: unknown) {
    // If table doesn't exist, silently fail (analytics is non-critical)
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.warn('[Analytics] scroll_depth table does not exist')
      return { success: false, skipped: true }
    }

    console.error('[Analytics] Failed to track scroll depth:', error)
    return { success: false }
  }
})
