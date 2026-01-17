// server/api/cars/manufacturers/[id].delete.ts
import { getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Manufacturer ID is required',
    })
  }

  try {
    // Check if manufacturer has models
    const models = await query<{ id: number }>(
      'SELECT id FROM car_models WHERE manufacturer_id = $1 LIMIT 1',
      [id],
    )

    if (models.length > 0) {
      throw createError({
        statusCode: 400,
        message:
          'Cannot delete manufacturer with existing car models. Please delete all models first.',
      })
    }

    const result = await query('DELETE FROM car_manufacturers WHERE id = $1 RETURNING id', [id])

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Manufacturer not found',
      })
    }

    return {
      success: true,
      message: 'Manufacturer deleted successfully',
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete manufacturer'
    console.error('[Cars API] Error deleting manufacturer:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
