// server/api/admin/database-stats.get.ts
import { verifyAdminToken } from '~/server/utils/adminAuth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  // Verify admin authentication
  if (!verifyAdminToken(event)) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized' }
  }

  try {
    // Get list of all tables and their row counts
    const tables = await query<{ table_name: string }>(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    )

    const stats = await Promise.all(
      (tables || []).map(async (table) => {
        try {
          const result = await query<{ count: string }>(
            `SELECT COUNT(*) as count FROM ${table.table_name}`,
          )
          return {
            table: table.table_name,
            count: parseInt(result[0]?.count || '0', 10),
          }
        } catch (err) {
          console.error(`Failed to count rows in ${table.table_name}:`, err)
          return {
            table: table.table_name,
            count: 0,
          }
        }
      }),
    )

    return {
      success: true,
      stats,
    }
  } catch (error) {
    console.error('[API] Failed to fetch database statistics:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch database statistics',
    }
  }
})
