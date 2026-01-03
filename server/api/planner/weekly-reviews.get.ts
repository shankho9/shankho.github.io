import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

export interface WeeklyReview {
  id: number
  week_start_date: string
  wins: string | null
  improvements: string | null
  next_week_mits: string | null
  created_at: string
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const { weekStartDate } = getQuery(event)

  try {
    let sql = 'SELECT * FROM weekly_reviews WHERE 1=1'
    const params: unknown[] = []

    if (weekStartDate && typeof weekStartDate === 'string') {
      sql += ' AND week_start_date = $1'
      params.push(weekStartDate)
    }

    sql += ' ORDER BY week_start_date DESC LIMIT 1'

    const reviews = await query<WeeklyReview>(sql, params)

    return { review: reviews[0] || null }
  } catch (error: unknown) {
    console.error('Failed to fetch weekly review:', error)

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning null review')
        // Return null review instead of failing completely
        return { review: null }
      }
    }

    // For other errors, still throw to maintain error handling
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch weekly review',
    })
  }
})
