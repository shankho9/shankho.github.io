// server/api/admin/visitors.get.ts
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized' }
  }

  try {
    // Get unique visitors by page
    // Check if page_visits table exists first
    let pageVisits: Array<{
      page: string
      unique_visitors: number
      total_visits: number
      last_visit: string
    }> = []

    try {
      pageVisits = await query<{
        page: string
        unique_visitors: number
        total_visits: number
        last_visit: string
      }>(
        `SELECT 
          page,
          COUNT(DISTINCT ip_address) as unique_visitors,
          COUNT(*) as total_visits,
          MAX(created_at) as last_visit
        FROM page_visits
        GROUP BY page
        ORDER BY unique_visitors DESC, total_visits DESC`,
      )
    } catch (tableError: unknown) {
      // If table doesn't exist, return empty array
      if (tableError instanceof Error && tableError.message.includes('does not exist')) {
        console.warn(
          '[API] page_visits table does not exist. Run migration: npm run migrate:page-visits',
        )
        pageVisits = []
      } else {
        throw tableError
      }
    }

    // Get unique users who signed in
    const uniqueLogins = await query<{
      user_email: string
      user_name: string
      login_count: number
      first_login: string
      last_login: string
      pages: string[]
    }>(
      `SELECT 
        user_email,
        user_name,
        COUNT(*) as login_count,
        MIN(created_at) as first_login,
        MAX(created_at) as last_login,
        ARRAY_AGG(DISTINCT login_location) as pages
      FROM user_logins
      GROUP BY user_email, user_name
      ORDER BY login_count DESC, last_login DESC`,
    )

    // Get login statistics by page
    const loginStats = await query<{
      login_location: string
      unique_users: number
      total_logins: number
      last_login: string
    }>(
      `SELECT 
        login_location,
        COUNT(DISTINCT user_email) as unique_users,
        COUNT(*) as total_logins,
        MAX(created_at) as last_login
      FROM user_logins
      GROUP BY login_location
      ORDER BY unique_users DESC, total_logins DESC`,
    )

    return {
      success: true,
      pageVisits: pageVisits || [],
      uniqueLogins: uniqueLogins || [],
      loginStats: loginStats || [],
    }
  } catch (error) {
    console.error('[API] Failed to fetch visitor data:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch visitor data',
    }
  }
})
