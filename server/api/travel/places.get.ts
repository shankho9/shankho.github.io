import { createError, defineEventHandler, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  // SQL query to fetch places from the database
  const sql = 'SELECT * FROM travel_places ORDER BY created_at DESC'
  try {
    const places = await query(sql)
    return places
  } catch (err: unknown) {
    console.error('Failed to fetch places:', err)
    setResponseStatus(event, 500)
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch places',
      statusCode: 500,
    }
  }
})
