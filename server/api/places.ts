import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async () => {
  // SQL query to fetch places from the database
  const sql = 'SELECT * FROM travel_places ORDER BY created_at DESC'
  try {
    const places = await query(sql)
    return places
  } catch (err) {
    console.error(err)
    return { error: 'Failed to fetch places' }
  }
})
