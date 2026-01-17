// server/api/calculator/templates.get.ts
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

  try {
    const templates = await query<{
      id: number
      name: string
      description: string | null
      template_data: Record<string, unknown>
      is_default: boolean
      created_at: Date
      updated_at: Date
    }>(
      'SELECT id, name, description, template_data, is_default, created_at, updated_at FROM calculator_templates WHERE user_id = $1 ORDER BY is_default DESC, updated_at DESC',
      [user.id],
    )

    return {
      success: true,
      templates,
    }
  } catch (error) {
    console.error('[Calculator Templates] Error fetching templates:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch templates',
    })
  }
})
