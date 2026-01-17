// server/api/cars/search.get.ts
import { getQuery } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const searchTerm = (queryParams.q as string)?.trim()

  if (!searchTerm || searchTerm.length < 2) {
    return {
      success: true,
      results: [],
    }
  }

  try {
    const searchLower = searchTerm.toLowerCase()
    const searchPattern = `%${searchLower}%`

    // Step 1: Check for exact manufacturer match (most common case)
    const exactManufacturer = await query<{ id: number }>(
      `SELECT id FROM car_manufacturers WHERE LOWER(name) = $1 LIMIT 1`,
      [searchLower],
    )

    if (exactManufacturer.length > 0) {
      // Return all models from this manufacturer
      const models = await query<{
        type: string
        id: number
        manufacturer_id: number | null
        model_id: number | null
        name: string
        display_name: string
      }>(
        `
        SELECT 
          'model'::text as type,
          cm.id::integer,
          cm.manufacturer_id::integer,
          CAST(NULL AS INTEGER) as model_id,
          cm.name::text,
          (cmf.name || ' ' || cm.name)::text as display_name
        FROM car_models cm
        JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
        WHERE cm.manufacturer_id = $1
        ORDER BY cm.name
        LIMIT 50
      `,
        [exactManufacturer[0].id],
      )

      return {
        success: true,
        results: models,
      }
    }

    // Step 2: Check for exact model match (within a manufacturer)
    const exactModel = await query<{
      id: number
      manufacturer_id: number
      model_name: string
      manufacturer_name: string
    }>(
      `
      SELECT 
        cm.id,
        cm.manufacturer_id,
        cm.name as model_name,
        cmf.name as manufacturer_name
      FROM car_models cm
      JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
      WHERE LOWER(cm.name) = $1
      LIMIT 1
    `,
      [searchLower],
    )

    if (exactModel.length > 0) {
      // Return all variants for this model
      const variants = await query<{
        type: string
        id: number
        manufacturer_id: number | null
        model_id: number | null
        name: string
        display_name: string
      }>(
        `
        SELECT 
          'variant'::text as type,
          cv.id::integer,
          cm.manufacturer_id::integer,
          cv.model_id::integer,
          cv.variant_name::text as name,
          (cmf.name || ' ' || cm.name || ' ' || cv.variant_name)::text as display_name
        FROM car_variants cv
        JOIN car_models cm ON cv.model_id = cm.id
        JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
        WHERE cv.model_id = $1
        ORDER BY cv.variant_name
        LIMIT 50
      `,
        [exactModel[0].id],
      )

      return {
        success: true,
        results: variants,
      }
    }

    // Step 3: Check for manufacturer + model pattern (e.g., "Tata Nexon")
    const manufacturerModelMatch = searchLower.match(/^([a-z\s]+)\s+([a-z\s]+)$/)
    if (manufacturerModelMatch) {
      const [, manufacturerPart, modelPart] = manufacturerModelMatch
      const modelMatch = await query<{ id: number }>(
        `
        SELECT cm.id
        FROM car_models cm
        JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
        WHERE LOWER(cmf.name) LIKE $1 AND LOWER(cm.name) LIKE $2
        LIMIT 1
      `,
        [`%${manufacturerPart.trim()}%`, `%${modelPart.trim()}%`],
      )

      if (modelMatch.length > 0) {
        // Return all variants for this model
        const variants = await query<{
          type: string
          id: number
          manufacturer_id: number | null
          model_id: number | null
          name: string
          display_name: string
        }>(
          `
          SELECT 
            'variant'::text as type,
            cv.id::integer,
            cm.manufacturer_id::integer,
            cv.model_id::integer,
            cv.variant_name::text as name,
            (cmf.name || ' ' || cm.name || ' ' || cv.variant_name)::text as display_name
          FROM car_variants cv
          JOIN car_models cm ON cv.model_id = cm.id
          JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
          WHERE cv.model_id = $1
          ORDER BY cv.variant_name
          LIMIT 50
        `,
          [modelMatch[0].id],
        )

        return {
          success: true,
          results: variants,
        }
      }
    }

    // Step 4: Fallback to general search (partial matches)
    const results = await query<{
      type: string
      id: number
      manufacturer_id: number | null
      model_id: number | null
      name: string
      display_name: string
    }>(
      `
      WITH manufacturer_matches AS (
        SELECT 
          'manufacturer'::text as type,
          id::integer,
          CAST(NULL AS INTEGER) as manufacturer_id,
          CAST(NULL AS INTEGER) as model_id,
          name::text,
          name::text as display_name,
          1 as priority
        FROM car_manufacturers
        WHERE LOWER(name) LIKE $1
        LIMIT 5
      ),
      model_matches AS (
        SELECT 
          'model'::text as type,
          cm.id::integer,
          cm.manufacturer_id::integer,
          CAST(NULL AS INTEGER) as model_id,
          cm.name::text,
          (cmf.name || ' ' || cm.name)::text as display_name,
          2 as priority
        FROM car_models cm
        JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
        WHERE LOWER(cm.name) LIKE $1
        LIMIT 10
      ),
      variant_matches AS (
        SELECT 
          'variant'::text as type,
          cv.id::integer,
          cm.manufacturer_id::integer,
          cv.model_id::integer,
          cv.variant_name::text as name,
          (cmf.name || ' ' || cm.name || ' ' || cv.variant_name)::text as display_name,
          3 as priority
        FROM car_variants cv
        JOIN car_models cm ON cv.model_id = cm.id
        JOIN car_manufacturers cmf ON cm.manufacturer_id = cmf.id
        WHERE LOWER(cv.variant_name) LIKE $1
          OR LOWER(cm.name || ' ' || cv.variant_name) LIKE $1
        LIMIT 15
      )
      SELECT type, id, manufacturer_id, model_id, name, display_name
      FROM (
        SELECT * FROM manufacturer_matches
        UNION ALL
        SELECT * FROM model_matches
        UNION ALL
        SELECT * FROM variant_matches
      ) combined
      ORDER BY priority, display_name
      LIMIT 30
    `,
      [searchPattern],
    )

    return {
      success: true,
      results,
    }
  } catch (error) {
    console.error('[Cars API] Error searching:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to search cars',
    })
  }
})
