import { defineEventHandler, getQuery } from 'h3'
import { parseLibraryEngagementKind } from '~/server/utils/libraryEngagement'
import { getLibraryLikeState } from '~/server/utils/libraryEngagementService'

export default defineEventHandler(async (event) => {
  const { itemId, kind: kindRaw } = getQuery(event)

  if (!itemId || typeof itemId !== 'string') {
    return {
      success: false,
      count: 0,
      isLiked: false,
      error: 'Missing or invalid itemId',
    }
  }

  const kind = parseLibraryEngagementKind(kindRaw, 'gallery')

  try {
    return await getLibraryLikeState(event, kind, itemId)
  } catch (error: unknown) {
    console.error('[API] Failed to get library like count:', error)
    return {
      success: false,
      count: 0,
      isLiked: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
