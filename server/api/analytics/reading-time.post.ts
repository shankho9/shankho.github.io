import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

/**
 * Track reading time analytics
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { page, startTime, endTime, duration, wordCount, estimatedReadingTime } = body

  if (!page || typeof duration !== 'number') {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: page, duration',
    })
  }

  try {
    // Store reading time data
    // Note: You may need to create a reading_time table if it doesn't exist
    await query(
      `INSERT INTO reading_time (page, start_time, end_time, duration, word_count, estimated_reading_time, created_at)
       VALUES ($1, to_timestamp($2 / 1000.0), to_timestamp($3 / 1000.0), $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [
        page,
        startTime || Date.now(),
        endTime || Date.now(),
        duration,
        wordCount || 0,
        estimatedReadingTime || 0,
      ],
    )

    return { success: true }
  } catch (error: unknown) {
    // If table doesn't exist, silently fail (analytics is non-critical)
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.warn('[Analytics] reading_time table does not exist')
      return { success: false, skipped: true }
    }

    console.error('[Analytics] Failed to track reading time:', error)
    return { success: false }
  }
})
