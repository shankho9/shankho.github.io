import { requireAdminUser } from '~/server/utils/adminUsers'
import { query } from '~/server/utils/db'

interface UniqueVisitorRow {
  visitor_id: string
  visitor_type: string
  display_name: string | null
  user_role: string | null
  total_events: number
  pages_count: number
  first_seen: string
  last_seen: string
  country: string | null
  browser: string | null
  ip_address: string | null
  last_page: string | null
}

async function safeQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    return await query<T>(sql, params)
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      return []
    }
    throw error
  }
}

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  try {
    const uniqueVisitors = await safeQuery<UniqueVisitorRow>(
      `SELECT * FROM (
        SELECT
          ul.user_email AS visitor_id,
          'registered' AS visitor_type,
          MAX(ul.user_name) AS display_name,
          MAX(u.role) AS user_role,
          COUNT(*)::int AS total_events,
          COUNT(DISTINCT ul.login_location)::int AS pages_count,
          MIN(ul.created_at) AS first_seen,
          MAX(ul.created_at) AS last_seen,
          MAX(ul.country) FILTER (WHERE ul.country IS NOT NULL AND ul.country <> '') AS country,
          MAX(ul.browser) FILTER (WHERE ul.browser IS NOT NULL AND ul.browser <> '') AS browser,
          MAX(ul.ip_address) FILTER (WHERE ul.ip_address IS NOT NULL AND ul.ip_address <> '') AS ip_address,
          (
            SELECT login_location FROM user_logins ul2
            WHERE ul2.user_email = ul.user_email
            ORDER BY ul2.created_at DESC
            LIMIT 1
          ) AS last_page
        FROM user_logins ul
        LEFT JOIN users u ON LOWER(u.email) = LOWER(ul.user_email)
        GROUP BY ul.user_email
        UNION ALL
        SELECT
          pv.ip_address AS visitor_id,
          'anonymous' AS visitor_type,
          NULL AS display_name,
          NULL AS user_role,
          COUNT(*)::int AS total_events,
          COUNT(DISTINCT pv.page)::int AS pages_count,
          MIN(pv.created_at) AS first_seen,
          MAX(pv.created_at) AS last_seen,
          MAX(pv.country) FILTER (WHERE pv.country IS NOT NULL AND pv.country <> '') AS country,
          MAX(pv.browser) FILTER (WHERE pv.browser IS NOT NULL AND pv.browser <> '') AS browser,
          pv.ip_address AS ip_address,
          (
            SELECT page FROM page_visits pv2
            WHERE pv2.ip_address = pv.ip_address
            ORDER BY pv2.created_at DESC
            LIMIT 1
          ) AS last_page
        FROM page_visits pv
        WHERE pv.ip_address IS NOT NULL AND pv.ip_address <> ''
        GROUP BY pv.ip_address
      ) visitors
      ORDER BY last_seen DESC`,
    )

    const pageVisits = await safeQuery<{
      page: string
      unique_visitors: number
      total_visits: number
      last_visit: string
    }>(
      `SELECT
        page,
        COUNT(DISTINCT ip_address)::int AS unique_visitors,
        COUNT(*)::int AS total_visits,
        MAX(created_at) AS last_visit
      FROM page_visits
      GROUP BY page
      ORDER BY unique_visitors DESC, total_visits DESC`,
    )

    const registeredCount = uniqueVisitors.filter((v) => v.visitor_type === 'registered').length
    const anonymousCount = uniqueVisitors.filter((v) => v.visitor_type === 'anonymous').length

    return {
      success: true,
      summary: {
        totalUniqueVisitors: uniqueVisitors.length,
        registeredVisitors: registeredCount,
        anonymousVisitors: anonymousCount,
        totalPageViews: pageVisits.reduce((sum, row) => sum + Number(row.total_visits || 0), 0),
      },
      uniqueVisitors,
      pageVisits,
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
