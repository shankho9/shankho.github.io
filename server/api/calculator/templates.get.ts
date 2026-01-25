// server/api/calculator/templates.get.ts
import { getQuery } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    })
  }

  const queryParams = getQuery(event)
  const calculatorKey = String(queryParams.calculatorKey || 'car-lease')

  try {
    const templates = await query<{
      id: number
      name: string
      description: string | null
      template_data: Record<string, unknown>
      is_default: boolean
      calculator_key: string
      created_at: Date
      updated_at: Date
    }>(
      'SELECT id, name, description, template_data, is_default, calculator_key, created_at, updated_at FROM calculator_templates WHERE user_id = $1 AND calculator_key = $2 ORDER BY is_default DESC, updated_at DESC',
      [user.id, calculatorKey],
    )

    return {
      success: true,
      templates,
    }
  } catch (error) {
    console.error('[Calculator Templates] Error fetching templates:', error)

    // Check if it's a database schema error (table or column doesn't exist)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (
      errorMessage.includes('does not exist') ||
      errorMessage.includes('relation') ||
      errorMessage.includes('column') ||
      errorMessage.includes('42P01') || // PostgreSQL: undefined_table
      errorMessage.includes('42703') // PostgreSQL: undefined_column
    ) {
      throw createError({
        statusCode: 500,
        message: 'Database schema needs updating. Please run the calculator templates migration.',
        data: {
          error: 'schema_missing',
          details:
            'The calculator_templates table or calculator_key column may not exist. Run: npm run migrate:calculator-templates:prod',
        },
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch templates',
    })
  }
})
