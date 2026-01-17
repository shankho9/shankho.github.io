// server/api/calculator/templates.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  const body = await readBody(event)
  const { name, description, template_data, is_default } = body

  if (!name || !template_data) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Name and template_data are required' }
  }

  try {
    const result = await query<{
      id: number
      name: string
      description: string | null
      template_data: Record<string, unknown>
      is_default: boolean
      created_at: Date
      updated_at: Date
    }>(
      `INSERT INTO calculator_templates (user_id, name, description, template_data, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, template_data, is_default, created_at, updated_at`,
      [user.id, name, description || null, JSON.stringify(template_data), is_default || false],
    )

    return {
      success: true,
      template: result[0],
    }
  } catch (error) {
    console.error('[Calculator Templates] Error creating template:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to create template' }
  }
})
