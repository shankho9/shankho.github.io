import { defineEventHandler, setResponseStatus } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
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
