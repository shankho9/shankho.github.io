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
  const { name, description, planData, isTemplate, isDefault } = body

  if (!name || !planData) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Name and planData are required' }
  }

  try {
    const result = await query<{
      id: number
      name: string
      description: string | null
      plan_data: unknown
      is_template: boolean
      is_default: boolean
      created_at: Date
      updated_at: Date
    }>(
      `INSERT INTO travel_plans (user_id, name, description, plan_data, is_template, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, plan_data, is_template, is_default, created_at, updated_at`,
      [user.id, name, description || null, JSON.stringify(planData), !!isTemplate, !!isDefault],
    )

    return { success: true, plan: result[0] }
  } catch (error) {
    console.error('[Travel Plans] Error creating plan:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to create travel plan' }
  }
})
