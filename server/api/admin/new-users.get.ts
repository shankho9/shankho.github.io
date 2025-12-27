// server/api/admin/new-users.get.ts
import { verifyAdminToken } from '~/server/utils/adminAuth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  // Verify admin authentication
  if (!verifyAdminToken(event)) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized' }
  }

  try {
    // Get first login for each user (new users)
    const newUsers = await query<{
      user_email: string
      user_name: string
      login_location: string
      country: string | null
      first_login: string
    }>(
      `SELECT 
        user_email,
        user_name,
        MIN(login_location) as login_location,
        MIN(country) as country,
        MIN(created_at) as first_login
      FROM user_logins
      GROUP BY user_email, user_name
      ORDER BY first_login DESC
      LIMIT 100`,
    )

    return {
      success: true,
      users: newUsers || [],
    }
  } catch (error) {
    console.error('[API] Failed to fetch new users:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch new users',
    }
  }
})
