// server/api/cars/variants.post.ts
import { readBody } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      model_id,
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

    if (!model_id || !variant_name || !variant_name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Model ID and variant name are required',
      })
    }

    const result = await query<{ id: number }>(
      `INSERT INTO car_variants (
        model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
        transmission_type, transmission_speeds, mileage_kmpl, seating_capacity,
        price_ex_showroom_inr, price_on_road_inr, length_mm, width_mm, height_mm,
        wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id`,
      [
        model_id,
        variant_name.trim(),
        fuel_type || null,
        engine_displacement_cc || null,
        max_power_ps || null,
        max_torque_nm || null,
        transmission_type || null,
        transmission_speeds || null,
        mileage_kmpl || null,
        seating_capacity ?? 5,
        price_ex_showroom_inr || null,
        price_on_road_inr || null,
        length_mm || null,
        width_mm || null,
        height_mm || null,
        wheelbase_mm || null,
        ground_clearance_mm || null,
        boot_space_liters || null,
        fuel_tank_capacity_liters || null,
      ],
    )

    // Fetch the created variant with full details
    const variant = await query<{
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
    }>('SELECT * FROM car_variants WHERE id = $1', [result[0].id])

    return {
      success: true,
      variant: variant[0],
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23505') {
        throw createError({
          statusCode: 400,
          message: 'Variant with this name already exists for this model',
        })
      }
      if (error.code === '23503') {
        throw createError({
          statusCode: 400,
          message: 'Invalid model ID',
        })
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to create variant'
    console.error('[Cars API] Error creating variant:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
