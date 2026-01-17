// server/api/cars/manufacturers.post.ts
import { readBody } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, country, logo_url } = body

    if (!name || !name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Manufacturer name is required',
      })
    }

    const result = await query<{ id: number }>(
      `INSERT INTO car_manufacturers (name, country, logo_url)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name.trim(), country || 'India', logo_url || null],
    )

    return {
      success: true,
      manufacturer: {
        id: result[0].id,
        name: name.trim(),
        country: country || 'India',
        logo_url: logo_url || null,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Unique constraint violation
      throw createError({
        statusCode: 400,
        message: 'Manufacturer with this name already exists',
      })
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to create manufacturer'
    console.error('[Cars API] Error creating manufacturer:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
