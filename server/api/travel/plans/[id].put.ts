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
    return { success: false, error: 'Plan ID is required' }
  }

  const body = await readBody(event)
  const { name, description, planData, isTemplate, isDefault } = body

  try {
    const existing = await query<{ user_id: number }>(
      'SELECT user_id FROM travel_plans WHERE id = $1',
      [id],
    )

    if (existing.length === 0) {
      setResponseStatus(event, 404)
      return { success: false, error: 'Plan not found' }
    }

    if (existing[0].user_id !== user.id) {
      setResponseStatus(event, 403)
      return { success: false, error: 'Not authorized' }
    }

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
    if (planData !== undefined) {
      updates.push(`plan_data = $${paramIndex++}`)
      values.push(JSON.stringify(planData))
    }
    if (isTemplate !== undefined) {
      updates.push(`is_template = $${paramIndex++}`)
      values.push(!!isTemplate)
    }
    if (isDefault !== undefined) {
      updates.push(`is_default = $${paramIndex++}`)
      values.push(!!isDefault)
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
      plan_data: unknown
      is_template: boolean
      is_default: boolean
      updated_at: Date
    }>(
      `UPDATE travel_plans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, name, description, plan_data, is_template, is_default, updated_at`,
      values,
    )

    return { success: true, plan: result[0] }
  } catch (error) {
    console.error('[Travel Plans] Error updating plan:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to update travel plan' }
  }
})
