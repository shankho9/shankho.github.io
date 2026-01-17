// server/api/cars/variant/[id].get.ts
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
    const variants = await query<{
      id: number
      model_id: number
      variant_name: string
      fuel_type: string | null
      engine_displacement_cc: number | null
      max_power_ps: number | null
      max_torque_nm: number | null
      transmission_type: string | null
      transmission_speeds: number | null
      mileage_kmpl: number | null
      seating_capacity: number
      price_ex_showroom_inr: number | null
      price_on_road_inr: number | null
      length_mm: number | null
      width_mm: number | null
      height_mm: number | null
      wheelbase_mm: number | null
      ground_clearance_mm: number | null
      boot_space_liters: number | null
      fuel_tank_capacity_liters: number | null
      manufacturer_name: string
      model_name: string
    }>(
      `
      SELECT 
        cv.*,
        cmf.name as manufacturer_name,
        cm.name as model_name
      FROM car_variants cv
      JOIN car_models cm ON cv.model_id = cm.id
      JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
      WHERE cv.id = $1
    `,
      [id],
    )

    if (variants.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Variant not found',
      })
    }

    return {
      success: true,
      variant: variants[0],
    }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    console.error('[Cars API] Error fetching variant:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch variant',
    })
  }
})
