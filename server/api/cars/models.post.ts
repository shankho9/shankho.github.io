// server/api/cars/models.post.ts
import { readBody } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { manufacturer_id, name, body_type, segment, launch_year, image_url } = body

    if (!manufacturer_id || !name || !name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Manufacturer ID and model name are required',
      })
    }

    const result = await query<{ id: number }>(
      `INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        manufacturer_id,
        name.trim(),
        body_type || null,
        segment || null,
        launch_year || null,
        image_url || null,
      ],
    )

    return {
      success: true,
      model: {
        id: result[0].id,
        manufacturer_id,
        name: name.trim(),
        body_type: body_type || null,
        segment: segment || null,
        launch_year: launch_year || null,
        image_url: image_url || null,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23505') {
        throw createError({
          statusCode: 400,
          message: 'Model with this name already exists for this manufacturer',
        })
      }
      if (error.code === '23503') {
        throw createError({
          statusCode: 400,
          message: 'Invalid manufacturer ID',
        })
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to create model'
    console.error('[Cars API] Error creating model:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
