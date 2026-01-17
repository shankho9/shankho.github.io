// server/api/calculator/templates/[id].put.ts
import { readBody, setResponseStatus, getRouterParam } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Template ID is required' }
  }

  const body = await readBody(event)
  const { name, description, template_data, is_default } = body

  try {
    // Verify template belongs to user
    const existing = await query<{ user_id: number }>(
      'SELECT user_id FROM calculator_templates WHERE id = $1',
      [id],
    )

    if (existing.length === 0) {
      setResponseStatus(event, 404)
      return { success: false, error: 'Template not found' }
    }

    if (existing[0].user_id !== user.id) {
      setResponseStatus(event, 403)
      return { success: false, error: 'Not authorized to update this template' }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description || null)
    }
    if (template_data !== undefined) {
      updates.push(`template_data = $${paramIndex++}`)
      values.push(JSON.stringify(template_data))
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`)
      values.push(is_default)
    }

    if (updates.length === 0) {
      setResponseStatus(event, 400)
      return { success: false, error: 'No fields to update' }
    }

    values.push(id)
    const result = await query<{
      id: number
      name: string
      description: string | null
      template_data: Record<string, unknown>
      is_default: boolean
      created_at: Date
      updated_at: Date
    }>(
      `UPDATE calculator_templates
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, template_data, is_default, created_at, updated_at`,
      values,
    )

    return {
      success: true,
      template: result[0],
    }
  } catch (error) {
    console.error('[Calculator Templates] Error updating template:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to update template' }
  }
})
