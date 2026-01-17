// server/api/cars/models.get.ts
import { getQuery } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const manufacturerId = queryParams.manufacturer_id

  try {
    let models
    if (manufacturerId) {
      models = await query<{
        id: number
        manufacturer_id: number
        name: string
        body_type: string | null
        segment: string | null
        launch_year: number | null
        image_url: string | null
      }>(
        'SELECT id, manufacturer_id, name, body_type, segment, launch_year, image_url FROM car_models WHERE manufacturer_id = $1 ORDER BY name',
        [manufacturerId],
      )
    } else {
      models = await query<{
        id: number
        manufacturer_id: number
        name: string
        body_type: string | null
        segment: string | null
        launch_year: number | null
        image_url: string | null
      }>(
        'SELECT id, manufacturer_id, name, body_type, segment, launch_year, image_url FROM car_models ORDER BY name',
      )
    }

    return {
      success: true,
      models,
    }
  } catch (error) {
    console.error('[Cars API] Error fetching models:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch models',
    })
  }
})
