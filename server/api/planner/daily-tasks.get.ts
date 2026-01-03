import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'
import type { Task } from './tasks.get'

// Helper function to get local date string in YYYY-MM-DD format
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default defineEventHandler(async (event) => {
  const { date } = getQuery(event)

  // Default to today if no date provided (using local timezone)
  const targetDate = date && typeof date === 'string' ? date : getLocalDateString()

  try {
    // Get tasks for the specified date
    const tasks = await query<Task>(
      `SELECT id, title, status, is_mit, priority, 
       TO_CHAR(planned_date, 'YYYY-MM-DD') as planned_date,
       notes, theme, created_at, updated_at
       FROM tasks 
       WHERE planned_date = $1::date
       ORDER BY is_mit DESC, priority DESC, created_at ASC`,
      [targetDate],
    )

    // Get MITs separately for easier access
    const mits = tasks.filter((task) => task.is_mit)

    return {
      date: targetDate,
      tasks,
      mits,
    }
  } catch (error: unknown) {
    console.error('Failed to fetch daily tasks:', error)

    // Check if it's a connection timeout error
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[API] Database connection timeout - returning empty tasks')
        // Return empty tasks instead of failing completely
        return {
          date: targetDate,
          tasks: [],
          mits: [],
        }
      }
    }

    // For other errors, still throw to maintain error handling
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch daily tasks',
    })
  }
})
