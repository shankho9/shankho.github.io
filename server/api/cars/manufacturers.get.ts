// server/api/cars/manufacturers.get.ts
import { query } from '~/server/utils/db'

export default defineEventHandler(async (_event) => {
  try {
    const manufacturers = await query<{
      id: number
      name: string
      country: string
      logo_url: string | null
    }>('SELECT id, name, country, logo_url FROM car_manufacturers ORDER BY name')

    return {
      success: true,
      manufacturers,
    }
  } catch (error) {
    console.error('[Cars API] Error fetching manufacturers:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch manufacturers',
    })
  }
})
