import { getQuery, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  const q = getQuery(event)
  const templatesOnly = q.templates === 'true'

  try {
    let sql = 'SELECT * FROM travel_plans WHERE user_id = $1'
    const params: unknown[] = [user.id]

    if (templatesOnly) {
      sql += ' AND is_template = true'
    }

    sql += ' ORDER BY is_default DESC, updated_at DESC'

    const plans = await query(sql, params)
    return { success: true, plans }
  } catch (error) {
    console.error('[Travel Plans] Error fetching plans:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to fetch travel plans' }
  }
})
