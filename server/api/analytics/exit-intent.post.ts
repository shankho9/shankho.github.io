import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

/**
 * Track exit intent analytics
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { page, timestamp } = body

  if (!page) {
    throw createError({
      statusCode: 400,
      message: 'Missing required field: page',
    })
  }

  try {
    // Store exit intent data
    // Note: You may need to create an exit_intent table if it doesn't exist
    await query(
      `INSERT INTO exit_intent (page, created_at)
       VALUES ($1, to_timestamp($2 / 1000.0))
       ON CONFLICT DO NOTHING`,
      [page, timestamp || Date.now()],
    )

    return { success: true }
  } catch (error: unknown) {
    // If table doesn't exist, silently fail (analytics is non-critical)
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.warn('[Analytics] exit_intent table does not exist')
      return { success: false, skipped: true }
    }

    console.error('[Analytics] Failed to track exit intent:', error)
    return { success: false }
  }
})
