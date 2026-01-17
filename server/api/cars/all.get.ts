// server/api/cars/all.get.ts
import { query } from '~/server/utils/db'

export default defineEventHandler(async (_event) => {
  try {
    // Fetch all data with joins for easy display
    const data = await query<{
      manufacturer_id: number
      manufacturer_name: string
      manufacturer_country: string
      manufacturer_logo_url: string | null
      model_id: number
      model_name: string
      model_body_type: string | null
      model_segment: string | null
      model_launch_year: number | null
      model_image_url: string | null
      variant_id: number
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
      `SELECT 
        cmf.id as manufacturer_id,
        cmf.name as manufacturer_name,
        cmf.country as manufacturer_country,
        cmf.logo_url as manufacturer_logo_url,
        cm.id as model_id,
        cm.name as model_name,
        cm.body_type as model_body_type,
        cm.segment as model_segment,
        cm.launch_year as model_launch_year,
        cm.image_url as model_image_url,
        cv.id as variant_id,
        cv.variant_name,
        cv.fuel_type,
        cv.engine_displacement_cc,
        cv.max_power_ps,
        cv.max_torque_nm,
        cv.transmission_type,
        cv.transmission_speeds,
        cv.mileage_kmpl,
        cv.seating_capacity,
        cv.price_ex_showroom_inr,
        cv.price_on_road_inr,
        cv.length_mm,
        cv.width_mm,
        cv.height_mm,
        cv.wheelbase_mm,
        cv.ground_clearance_mm,
        cv.boot_space_liters,
        cv.fuel_tank_capacity_liters
      FROM car_variants cv
      JOIN car_models cm ON cv.model_id = cm.id
      JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
      ORDER BY cmf.name, cm.name, cv.variant_name`,
    )

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw createError({
      statusCode: 500,
      message: `Failed to fetch car data: ${errorMessage}`,
    })
  }
})
