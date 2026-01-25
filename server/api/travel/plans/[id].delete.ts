import { setResponseStatus, getRouterParam } from 'h3'
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

    await query('DELETE FROM travel_plans WHERE id = $1', [id])
    return { success: true, message: 'Plan deleted successfully' }
  } catch (error) {
    console.error('[Travel Plans] Error deleting plan:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to delete travel plan' }
  }
})
