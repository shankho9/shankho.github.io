import { defineEventHandler, setResponseStatus, getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { error: 'Place ID is required' }
  }

  try {
    // Check if place exists
    const existing = await query('SELECT * FROM travel_places WHERE id = $1', [id])
    if (existing.length === 0) {
      setResponseStatus(event, 404)
      return { error: 'Place not found' }
    }

    // Delete the place
    await query('DELETE FROM travel_places WHERE id = $1', [id])

    return {
      success: true,
      message: 'Place deleted successfully',
    }
  } catch (err: unknown) {
    console.error('Failed to delete place:', err)
    setResponseStatus(event, 500)
    return {
      error: err instanceof Error ? err.message : 'Unknown error while deleting place',
      statusCode: 500,
    }
  }
})
