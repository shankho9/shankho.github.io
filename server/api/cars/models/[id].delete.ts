// server/api/cars/models/[id].delete.ts
import { getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Model ID is required',
    })
  }

  try {
    // Check if model has variants
    const variants = await query<{ id: number }>(
      'SELECT id FROM car_variants WHERE model_id = $1 LIMIT 1',
      [id],
    )

    if (variants.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'Cannot delete model with existing variants. Please delete all variants first.',
      })
    }

    const result = await query('DELETE FROM car_models WHERE id = $1 RETURNING id', [id])

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Model not found',
      })
    }

    return {
      success: true,
      message: 'Model deleted successfully',
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete model'
    console.error('[Cars API] Error deleting model:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
