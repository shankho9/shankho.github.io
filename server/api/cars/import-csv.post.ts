// server/api/cars/import-csv.post.ts
import { readMultipartFormData } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    const file = formData?.find((field) => field.name === 'file')

    if (!file || !file.data) {
      throw createError({
        statusCode: 400,
        message: 'CSV file is required',
      })
    }

    const csvText = file.data.toString('utf-8')
    const lines = csvText.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      throw createError({
        statusCode: 400,
        message: 'CSV file must contain header and at least one data row',
      })
    }

    // Parse CSV (simple parser - handles quoted fields)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++ // Skip next quote
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0])
    const expectedHeaders = [
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

    // Validate headers
    if (headers.length !== expectedHeaders.length) {
      throw createError({
        statusCode: 400,
        message: `Invalid CSV format. Expected ${expectedHeaders.length} columns, got ${headers.length}`,
      })
    }

    const dataRows = lines.slice(1)
    let imported = 0
    let updated = 0
    const errors: string[] = []

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = parseCSVLine(dataRows[i])
      if (row.length !== headers.length) continue

      try {
        const manufacturerName = row[1]?.replace(/^"|"$/g, '') || ''
        const manufacturerCountry = row[2]?.replace(/^"|"$/g, '') || 'India'
        const modelName = row[4]?.replace(/^"|"$/g, '') || ''
        const variantName = row[9]?.replace(/^"|"$/g, '') || ''

        if (!manufacturerName || !modelName || !variantName) {
          errors.push(
            `Row ${i + 2}: Missing required fields (Manufacturer, Model, or Variant name)`,
          )
          continue
        }

        // Get or create manufacturer
        let manufacturerId: number
        const existingManufacturer = await query<{ id: number }>(
          'SELECT id FROM car_manufacturers WHERE LOWER(name) = LOWER($1)',
          [manufacturerName],
        )

        if (existingManufacturer.length > 0) {
          manufacturerId = existingManufacturer[0].id
          // Update manufacturer if needed
          await query(
            'UPDATE car_manufacturers SET country = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [manufacturerCountry, manufacturerId],
          )
        } else {
          const newManufacturer = await query<{ id: number }>(
            'INSERT INTO car_manufacturers (name, country) VALUES ($1, $2) RETURNING id',
            [manufacturerName, manufacturerCountry],
          )
          manufacturerId = newManufacturer[0].id
        }

        // Get or create model
        let modelId: number
        const existingModel = await query<{ id: number }>(
          'SELECT id FROM car_models WHERE manufacturer_id = $1 AND LOWER(name) = LOWER($2)',
          [manufacturerId, modelName],
        )

        if (existingModel.length > 0) {
          modelId = existingModel[0].id
          // Update model
          await query(
            `UPDATE car_models 
             SET body_type = $1, segment = $2, launch_year = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [
              row[5]?.replace(/^"|"$/g, '') || null,
              row[6]?.replace(/^"|"$/g, '') || null,
              row[7] ? parseInt(row[7]) || null : null,
              modelId,
            ],
          )
        } else {
          const newModel = await query<{ id: number }>(
            'INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [
              manufacturerId,
              modelName,
              row[5]?.replace(/^"|"$/g, '') || null,
              row[6]?.replace(/^"|"$/g, '') || null,
              row[7] ? parseInt(row[7]) || null : null,
            ],
          )
          modelId = newModel[0].id
        }

        // Get or create variant
        const existingVariant = await query<{ id: number }>(
          'SELECT id FROM car_variants WHERE model_id = $1 AND LOWER(variant_name) = LOWER($2)',
          [modelId, variantName],
        )

        const parseNumber = (val: string): number | null => {
          const cleaned = val?.replace(/^"|"$/g, '') || ''
          return cleaned ? parseFloat(cleaned) || null : null
        }

        const parseIntValue = (val: string): number | null => {
          const cleaned = val?.replace(/^"|"$/g, '') || ''
          return cleaned ? parseInt(cleaned) || null : null
        }

        if (existingVariant.length > 0) {
          // Update variant
          await query(
            `UPDATE car_variants SET
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
             WHERE id = $19`,
            [
              variantName,
              row[10]?.replace(/^"|"$/g, '') || null,
              parseIntValue(row[11]),
              parseIntValue(row[12]),
              parseIntValue(row[13]),
              row[14]?.replace(/^"|"$/g, '') || null,
              parseIntValue(row[15]),
              parseNumber(row[16]),
              parseIntValue(row[17]) || 5,
              parseNumber(row[18]),
              parseNumber(row[19]),
              parseIntValue(row[20]),
              parseIntValue(row[21]),
              parseIntValue(row[22]),
              parseIntValue(row[23]),
              parseIntValue(row[24]),
              parseIntValue(row[25]),
              parseIntValue(row[26]),
              existingVariant[0].id,
            ],
          )
          updated++
        } else {
          // Create variant
          await query(
            `INSERT INTO car_variants (
              model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
              transmission_type, transmission_speeds, mileage_kmpl, seating_capacity,
              price_ex_showroom_inr, price_on_road_inr, length_mm, width_mm, height_mm,
              wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [
              modelId,
              variantName,
              row[10]?.replace(/^"|"$/g, '') || null,
              parseIntValue(row[11]),
              parseIntValue(row[12]),
              parseIntValue(row[13]),
              row[14]?.replace(/^"|"$/g, '') || null,
              parseIntValue(row[15]),
              parseNumber(row[16]),
              parseIntValue(row[17]) || 5,
              parseNumber(row[18]),
              parseNumber(row[19]),
              parseIntValue(row[20]),
              parseIntValue(row[21]),
              parseIntValue(row[22]),
              parseIntValue(row[23]),
              parseIntValue(row[24]),
              parseIntValue(row[25]),
              parseIntValue(row[26]),
            ],
          )
          imported++
        }
      } catch (rowError: unknown) {
        const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error'
        errors.push(`Row ${i + 2}: ${errorMessage}`)
      }
    }

    return {
      success: true,
      imported,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Import completed: ${imported} new records, ${updated} updated records${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to import CSV'
    console.error('[Cars API] Error importing CSV:', error)
    throw createError({
      statusCode: 500,
      message: errorMessage,
    })
  }
})
