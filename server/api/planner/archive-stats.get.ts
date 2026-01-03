import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'

export interface ArchiveStats {
  totalArchived: number
  totalArchivedMits: number
  totalArchivedRegular: number
  archivedByTheme: Array<{ theme: string | null; count: number }>
  archivedByPeriod: {
    today: number
    thisWeek: number
    thisMonth: number
    lastMonth: number
    last3Months: number
    last6Months: number
    lastYear: number
  }
  dailyTrend: Array<{ date: string; count: number; mits: number }>
  weeklyTrend: Array<{ week: string; count: number; mits: number }>
  monthlyTrend: Array<{ month: string; count: number; mits: number }>
  themeTrend: Array<{
    theme: string | null
    period: string
    count: number
  }>
}

export default defineEventHandler(async (event): Promise<ArchiveStats> => {
  const { period } = getQuery(event)
  // periodDays is reserved for future use if needed for filtering
  const _periodDays =
    period === 'year' ? 365 : period === '6months' ? 180 : period === '3months' ? 90 : 30

  // Default empty stats to return if table doesn't exist or errors occur
  const emptyStats: ArchiveStats = {
    totalArchived: 0,
    totalArchivedMits: 0,
    totalArchivedRegular: 0,
    archivedByTheme: [],
    archivedByPeriod: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      lastMonth: 0,
      last3Months: 0,
      last6Months: 0,
      lastYear: 0,
    },
    dailyTrend: [],
    weeklyTrend: [],
    monthlyTrend: [],
    themeTrend: [],
  }

  try {
    // Check if table exists first (wrap in try-catch in case of connection issues)
    let tableExists = false
    try {
      const tableCheck = await query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tasks_archive'
        ) as exists`,
      )
      tableExists = tableCheck[0]?.exists === true
    } catch (tableCheckError) {
      console.warn('[Archive Stats] Could not check if table exists:', tableCheckError)
      // Assume table doesn't exist if we can't check
      tableExists = false
    }

    if (!tableExists) {
      console.warn(
        '[Archive Stats] tasks_archive table does not exist. Run migration to create it.',
      )
      return emptyStats
    }

    // Total archived tasks
    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tasks_archive',
    )
    const totalArchived = parseInt(totalResult[0]?.count || '0', 10)

    // Total MITs and regular tasks
    const mitsResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tasks_archive WHERE is_mit = true',
    )
    const totalArchivedMits = parseInt(mitsResult[0]?.count || '0', 10)
    const totalArchivedRegular = totalArchived - totalArchivedMits

    // Archived by theme (top 10)
    const themeResult = await query<{ theme: string | null; count: string }>(
      `SELECT theme, COUNT(*) as count 
       FROM tasks_archive 
       GROUP BY theme 
       ORDER BY count DESC 
       LIMIT 10`,
    )
    const archivedByTheme = themeResult.map((r) => ({
      theme: r.theme,
      count: parseInt(r.count, 10),
    }))

    // Archived by period
    const periodQueryResult = await query<{
      today: string
      this_week: string
      this_month: string
      last_month: string
      last_3_months: string
      last_6_months: string
      last_year: string
    }>(
      `SELECT 
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE)::text as today,
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days')::text as this_week,
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days')::text as this_month,
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '60 days' 
                         AND completed_at < CURRENT_DATE - INTERVAL '30 days')::text as last_month,
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '90 days')::text as last_3_months,
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '180 days')::text as last_6_months,
        COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '365 days')::text as last_year
       FROM tasks_archive`,
    )

    const periodData = periodQueryResult[0] || {
      today: '0',
      this_week: '0',
      this_month: '0',
      last_month: '0',
      last_3_months: '0',
      last_6_months: '0',
      last_year: '0',
    }

    const archivedByPeriod = {
      today: parseInt(periodData.today, 10),
      thisWeek: parseInt(periodData.this_week, 10),
      thisMonth: parseInt(periodData.this_month, 10),
      lastMonth: parseInt(periodData.last_month, 10),
      last3Months: parseInt(periodData.last_3_months, 10),
      last6Months: parseInt(periodData.last_6_months, 10),
      lastYear: parseInt(periodData.last_year, 10),
    }

    // Daily trend (last 30 days)
    const dailyTrendResult = await query<{ date: string; count: string; mits: string }>(
      `SELECT 
        TO_CHAR(completed_at, 'YYYY-MM-DD') as date,
        COUNT(*)::text as count,
        COUNT(*) FILTER (WHERE is_mit = true)::text as mits
       FROM tasks_archive
       WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY TO_CHAR(completed_at, 'YYYY-MM-DD')
       ORDER BY date DESC`,
    )
    const dailyTrend = dailyTrendResult.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
      mits: parseInt(r.mits, 10),
    }))

    // Weekly trend (last 12 weeks)
    const weeklyTrendResult = await query<{ week: string; count: string; mits: string }>(
      `SELECT 
        TO_CHAR(DATE_TRUNC('week', completed_at), 'YYYY-MM-DD') as week,
        COUNT(*)::text as count,
        COUNT(*) FILTER (WHERE is_mit = true)::text as mits
       FROM tasks_archive
       WHERE completed_at >= CURRENT_DATE - INTERVAL '84 days'
       GROUP BY DATE_TRUNC('week', completed_at)
       ORDER BY week DESC
       LIMIT 12`,
    )
    const weeklyTrend = weeklyTrendResult.map((r) => ({
      week: r.week,
      count: parseInt(r.count, 10),
      mits: parseInt(r.mits, 10),
    }))

    // Monthly trend (last 12 months)
    const monthlyTrendResult = await query<{ month: string; count: string; mits: string }>(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') as month,
        COUNT(*)::text as count,
        COUNT(*) FILTER (WHERE is_mit = true)::text as mits
       FROM tasks_archive
       WHERE completed_at >= CURRENT_DATE - INTERVAL '365 days'
       GROUP BY DATE_TRUNC('month', completed_at)
       ORDER BY month DESC
       LIMIT 12`,
    )
    const monthlyTrend = monthlyTrendResult.map((r) => ({
      month: r.month,
      count: parseInt(r.count, 10),
      mits: parseInt(r.mits, 10),
    }))

    // Theme trend over time (last 3 months, top 5 themes)
    const themeTrendResult = await query<{
      theme: string | null
      period: string
      count: string
    }>(
      `SELECT 
        theme,
        TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') as period,
        COUNT(*)::text as count
       FROM tasks_archive
       WHERE completed_at >= CURRENT_DATE - INTERVAL '90 days'
         AND theme IS NOT NULL
       GROUP BY theme, DATE_TRUNC('month', completed_at)
       ORDER BY period DESC, count DESC
       LIMIT 20`,
    )
    const themeTrend = themeTrendResult.map((r) => ({
      theme: r.theme,
      period: r.period,
      count: parseInt(r.count, 10),
    }))

    return {
      totalArchived,
      totalArchivedMits,
      totalArchivedRegular,
      archivedByTheme,
      archivedByPeriod,
      dailyTrend,
      weeklyTrend,
      monthlyTrend,
      themeTrend,
    }
  } catch (error: unknown) {
    console.error('Failed to fetch archive stats:', error)

    // Check if it's a table doesn't exist error
    if (error instanceof Error) {
      const errorMessage = error.message || ''
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('relation') ||
        errorMessage.includes('table') ||
        errorMessage.includes('42P01') // PostgreSQL error code for table doesn't exist
      ) {
        console.warn(
          '[Archive Stats] tasks_archive table does not exist yet. Run migration to create it.',
        )
        // Return empty stats instead of error
        return emptyStats
      }

      // Check if it's a connection timeout error
      if (
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Connection terminated')
      ) {
        console.warn('[Archive Stats] Database connection timeout - returning empty stats')
        return emptyStats
      }
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch archive statistics',
    })
  }
})
