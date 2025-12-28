import { defineEventHandler, readBody, setResponseStatus, getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Place ID is required' }
  }

  const body = await readBody(event)
  const { name, lat, lng, description = '', blog_slug = null, year, type = null } = body

  // Name, lat, lng are required but should match existing values (not changed)
  // They're sent to maintain data integrity but shouldn't be validated as new values
  if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
    setResponseStatus(event, 400)
    return { error: 'Missing required fields: name, lat, lng' }
  }

  // Verify that name, lat, lng match the existing record (prevent coordinate changes)
  const existing = await query('SELECT * FROM travel_places WHERE id = $1', [id])
  if (existing.length === 0) {
    setResponseStatus(event, 404)
    return { error: 'Place not found' }
  }

  const currentPlace = existing[0]
  // Ensure name and coordinates haven't changed (only type, year, description can change)
  if (
    currentPlace.name !== name ||
    Math.abs(currentPlace.lat - lat) > 0.000001 ||
    Math.abs(currentPlace.lng - lng) > 0.000001
  ) {
    setResponseStatus(event, 400)
    return {
      error:
        'Name and coordinates cannot be changed. Please delete and create a new entry to change location.',
    }
  }

  if (year && typeof year !== 'number') {
    setResponseStatus(event, 400)
    return { error: 'Year must be a number if provided' }
  }

  if (type && type !== 'home' && type !== 'trip') {
    setResponseStatus(event, 400)
    return { error: 'Invalid type. Only "home" or "trip" are allowed.' }
  }

  try {
    // Update the place (name, lat, lng are already verified above)
    const rows = await query(
      `UPDATE travel_places 
       SET name = $1, lat = $2, lng = $3, description = $4, blog_slug = $5, year = $6, type = $7
       WHERE id = $8
       RETURNING *`,
      [name, lat, lng, description, blog_slug, year, type, id],
    )

    return {
      success: true,
      place: rows[0],
    }
  } catch (err: unknown) {
    console.error('Failed to update place:', err)
    setResponseStatus(event, 500)
    return {
      error: err instanceof Error ? err.message : 'Unknown error while updating place',
      statusCode: 500,
    }
  }
})
