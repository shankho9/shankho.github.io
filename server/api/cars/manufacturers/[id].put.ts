// server/api/cars/manufacturers/[id].put.ts
import { getRouterParam, readBody } from 'h3'
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
    const body = await readBody(event)
    const { name, country, logo_url } = body

    if (!name || !name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Manufacturer name is required',
      })
    }

    const result = await query<{
      id: number
      name: string
      country: string
      logo_url: string | null
    }>(
      `UPDATE car_manufacturers
       SET name = $1, country = $2, logo_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, country, logo_url`,
      [name.trim(), country || 'India', logo_url || null, id],
    )

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Manufacturer not found',
      })
    }

    return {
      success: true,
      manufacturer: result[0],
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw createError({
        statusCode: 400,
        message: 'Manufacturer with this name already exists',
      })
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update manufacturer'
    console.error('[Cars API] Error updating manufacturer:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
