import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

interface WeeklyReviewBody {
  week_start_date: string
  wins?: string | null
  improvements?: string | null
  next_week_mits?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<WeeklyReviewBody>(event)
  const { week_start_date, wins = null, improvements = null, next_week_mits = null } = body

  if (!week_start_date || typeof week_start_date !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'week_start_date is required',
    })
  }

  try {
    const result = await query<{
      id: number
      week_start_date: string
      wins: string | null
      improvements: string | null
      next_week_mits: string | null
      created_at: string
      updated_at: string
    }>(
      `INSERT INTO weekly_reviews (week_start_date, wins, improvements, next_week_mits)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (week_start_date) 
       DO UPDATE SET wins = EXCLUDED.wins, improvements = EXCLUDED.improvements, next_week_mits = EXCLUDED.next_week_mits, updated_at = CURRENT_TIMESTAMP
       RETURNING id, week_start_date, wins, improvements, next_week_mits, created_at, updated_at`,
      [week_start_date, wins, improvements, next_week_mits],
    )

    return {
      success: true,
      review: result[0],
    }
  } catch (error: unknown) {
    console.error('Failed to create/update weekly review:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create/update weekly review',
    })
  }
})
