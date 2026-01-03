import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (_event) => {
  try {
    // Get all distinct themes (excluding null)
    const themes = await query<{ theme: string }>(
      `SELECT DISTINCT theme 
       FROM tasks 
       WHERE theme IS NOT NULL AND theme != ''
       ORDER BY theme ASC`,
    )

    return {
      themes: themes.map((t) => t.theme),
    }
  } catch (error: unknown) {
    console.error('Failed to fetch themes:', error)

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning empty themes')
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
