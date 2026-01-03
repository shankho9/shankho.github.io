import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { cache } from '~/server/utils/cache'

export default defineEventHandler(async (_event) => {
  try {
    // Check cache first (60 second TTL for themes - they change less frequently)
    const cacheKey = 'themes:all'
    const cached = cache.get<{ themes: string[] }>(cacheKey)
    if (cached) {
      return cached
    }

    // Get all distinct themes (excluding null)
    const themes = await query<{ theme: string }>(
      `SELECT DISTINCT theme 
       FROM tasks 
       WHERE theme IS NOT NULL AND theme != ''
       ORDER BY theme ASC`,
    )

    const result = {
      themes: themes.map((t) => t.theme),
    }

    // Cache the result for 60 seconds
    cache.set(cacheKey, result, 60000)

    return result
  } catch (error: unknown) {
    console.error('Failed to fetch themes:', error)

    // Check if it's a connection timeout error (including AggregateError from pg-pool)
    if (error instanceof Error) {
      const errorMessage = error.message || ''
      const errorName = error.name || ''

      // Check for timeout errors
      if (
        errorName === 'AggregateError' ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Connection terminated')
      ) {
        console.error('[API] Database connection timeout - returning empty themes')
        return { themes: [] }
      }

      // Check for connection errors
      if (
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('getaddrinfo')
      ) {
        console.error('[API] Database connection error - returning empty themes')
        return { themes: [] }
      }
    }

    // For other errors, still throw to maintain error handling
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch themes',
    })
  }
})
