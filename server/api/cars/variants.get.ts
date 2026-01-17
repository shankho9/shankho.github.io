// server/api/cars/variants.get.ts
import { getQuery } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const modelId = queryParams.model_id

  if (!modelId) {
    throw createError({
      statusCode: 400,
      message: 'model_id is required',
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
    }>('SELECT * FROM car_variants WHERE model_id = $1 ORDER BY variant_name', [modelId])

    return {
      success: true,
      variants,
    }
  } catch (error) {
    console.error('[Cars API] Error fetching variants:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch variants',
    })
  }
})
