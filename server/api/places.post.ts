import { defineEventHandler, readBody } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, lat, lng, description = '', blog_slug = null, year } = body

  if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
    return { error: 'Missing required fields: name, lat, lng' }
  }

  if (year && typeof year !== 'number') {
    return { error: 'Year must be a number if provided' }
  }

  try {
    const existing = await query(
      `SELECT * FROM travel_places WHERE name = $1 AND lat = $2 AND lng = $3`,
      [name, lat, lng],
    )

    if (existing.length > 0) {
      return {
        success: false,
        message: 'Place already exists',
        place: existing[0],
      }
    }

    const rows = await query(
      `INSERT INTO travel_places (name, lat, lng, description, blog_slug, year)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, lat, lng, description, blog_slug, year],
    )

    return {
      success: true,
      place: rows[0],
    }
  } catch (err: unknown) {
    console.error(err)
    return {
      error: err instanceof Error ? err.message : 'Unknown error while inserting place',
    }
  }
})
