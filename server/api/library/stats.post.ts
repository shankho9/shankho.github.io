import { createError, defineEventHandler, readBody } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { parseLibraryEngagementKind } from '~/server/utils/libraryEngagement'
import { batchLibraryStats } from '~/server/utils/libraryEngagementService'

interface StatsBody {
  itemIds?: Array<string | number>
  kind?: string
}

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody<StatsBody>(event)
  const rawIds = body?.itemIds
  const kind = parseLibraryEngagementKind(body?.kind, 'gallery')

  if (!rawIds?.length) {
    return { success: true, stats: {} }
  }

  try {
    const stats = await batchLibraryStats(kind, rawIds)
    return { success: true, stats }
  } catch (error: unknown) {
    console.error('[API] Failed to batch-load library stats:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to load library stats',
    })
  }
})
