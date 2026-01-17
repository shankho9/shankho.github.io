// server/api/cars/variants/[id].delete.ts
import { getRouterParam } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Variant ID is required',
    })
  }

  try {
    const result = await query('DELETE FROM car_variants WHERE id = $1 RETURNING id', [id])

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Variant not found',
      })
    }

    return {
      success: true,
      message: 'Variant deleted successfully',
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete variant'
    console.error('[Cars API] Error deleting variant:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
