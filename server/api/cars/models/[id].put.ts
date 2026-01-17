// server/api/cars/models/[id].put.ts
import { getRouterParam, readBody } from 'h3'
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
    const body = await readBody(event)
    const { name, body_type, segment, launch_year, image_url } = body

    if (!name || !name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Model name is required',
      })
    }

    const result = await query<{
      id: number
      manufacturer_id: number
      name: string
      body_type: string | null
      segment: string | null
      launch_year: number | null
      image_url: string | null
    }>(
      `UPDATE car_models
       SET name = $1, body_type = $2, segment = $3, launch_year = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, manufacturer_id, name, body_type, segment, launch_year, image_url`,
      [name.trim(), body_type || null, segment || null, launch_year || null, image_url || null, id],
    )

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Model not found',
      })
    }

    return {
      success: true,
      model: result[0],
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw createError({
        statusCode: 400,
        message: 'Model with this name already exists for this manufacturer',
      })
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update model'
    console.error('[Cars API] Error updating model:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
