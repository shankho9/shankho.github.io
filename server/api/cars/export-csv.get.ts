// server/api/cars/export-csv.get.ts
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Fetch all car data with joins
    const data = await query<{
      manufacturer_id: number
      manufacturer_name: string
      manufacturer_country: string
      model_id: number
      model_name: string
      model_body_type: string | null
      model_segment: string | null
      model_launch_year: number | null
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
        cm.id as model_id,
        cm.name as model_name,
        cm.body_type as model_body_type,
        cm.segment as model_segment,
        cm.launch_year as model_launch_year,
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

    // Convert to CSV
    const headers = [
      'Manufacturer ID',
      'Manufacturer Name',
      'Manufacturer Country',
      'Model ID',
      'Model Name',
      'Body Type',
      'Segment',
      'Launch Year',
      'Variant ID',
      'Variant Name',
      'Fuel Type',
      'Engine Displacement (cc)',
      'Max Power (PS)',
      'Max Torque (Nm)',
      'Transmission Type',
      'Transmission Speeds',
      'Mileage (kmpl)',
      'Seating Capacity',
      'Price Ex-Showroom (INR)',
      'Price On-Road (INR)',
      'Length (mm)',
      'Width (mm)',
      'Height (mm)',
      'Wheelbase (mm)',
      'Ground Clearance (mm)',
      'Boot Space (liters)',
      'Fuel Tank Capacity (liters)',
    ]

    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        [
          row.manufacturer_id,
          `"${(row.manufacturer_name || '').replace(/"/g, '""')}"`,
          `"${(row.manufacturer_country || '').replace(/"/g, '""')}"`,
          row.model_id,
          `"${(row.model_name || '').replace(/"/g, '""')}"`,
          `"${(row.model_body_type || '').replace(/"/g, '""')}"`,
          `"${(row.model_segment || '').replace(/"/g, '""')}"`,
          row.model_launch_year || '',
          row.variant_id,
          `"${(row.variant_name || '').replace(/"/g, '""')}"`,
          `"${(row.fuel_type || '').replace(/"/g, '""')}"`,
          row.engine_displacement_cc || '',
          row.max_power_ps || '',
          row.max_torque_nm || '',
          `"${(row.transmission_type || '').replace(/"/g, '""')}"`,
          row.transmission_speeds || '',
          row.mileage_kmpl || '',
          row.seating_capacity,
          row.price_ex_showroom_inr || '',
          row.price_on_road_inr || '',
          row.length_mm || '',
          row.width_mm || '',
          row.height_mm || '',
          row.wheelbase_mm || '',
          row.ground_clearance_mm || '',
          row.boot_space_liters || '',
          row.fuel_tank_capacity_liters || '',
        ].join(','),
      ),
    ]

    const csv = csvRows.join('\n')

    // Set headers for CSV download
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="car-database-${new Date().toISOString().split('T')[0]}.csv"`,
    )

    return csv
  } catch (error) {
    console.error('[Cars API] Error exporting CSV:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to export CSV',
    })
  }
})
