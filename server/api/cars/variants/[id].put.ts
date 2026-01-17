// server/api/cars/variants/[id].put.ts
import { getRouterParam, readBody } from 'h3'
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
    const body = await readBody(event)
    const {
      variant_name,
      fuel_type,
      engine_displacement_cc,
      max_power_ps,
      max_torque_nm,
      transmission_type,
      transmission_speeds,
      mileage_kmpl,
      seating_capacity,
      price_ex_showroom_inr,
      price_on_road_inr,
      length_mm,
      width_mm,
      height_mm,
      wheelbase_mm,
      ground_clearance_mm,
      boot_space_liters,
      fuel_tank_capacity_liters,
    } = body

    if (!variant_name || !variant_name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Variant name is required',
      })
    }

    const result = await query<{
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
    }>(
      `UPDATE car_variants
       SET 
         variant_name = $1,
         fuel_type = $2,
         engine_displacement_cc = $3,
         max_power_ps = $4,
         max_torque_nm = $5,
         transmission_type = $6,
         transmission_speeds = $7,
         mileage_kmpl = $8,
         seating_capacity = $9,
         price_ex_showroom_inr = $10,
         price_on_road_inr = $11,
         length_mm = $12,
         width_mm = $13,
         height_mm = $14,
         wheelbase_mm = $15,
         ground_clearance_mm = $16,
         boot_space_liters = $17,
         fuel_tank_capacity_liters = $18,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [
        variant_name.trim(),
        fuel_type || null,
        engine_displacement_cc || null,
        max_power_ps || null,
        max_torque_nm || null,
        transmission_type || null,
        transmission_speeds || null,
        mileage_kmpl || null,
        seating_capacity || 5,
        price_ex_showroom_inr || null,
        price_on_road_inr || null,
        length_mm || null,
        width_mm || null,
        height_mm || null,
        wheelbase_mm || null,
        ground_clearance_mm || null,
        boot_space_liters || null,
        fuel_tank_capacity_liters || null,
        id,
      ],
    )

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Variant not found',
      })
    }

    return {
      success: true,
      variant: result[0],
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw createError({
        statusCode: 400,
        message: 'Variant with this name already exists for this model',
      })
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update variant'
    console.error('[Cars API] Error updating variant:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
