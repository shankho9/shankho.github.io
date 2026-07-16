import { readBody, defineEventHandler } from 'h3'
import { parseLibraryEngagementKind, setLibraryLike } from '~/server/utils/libraryEngagementService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { itemId, action, kind: kindRaw } = body || {}

  if (!itemId || !['like', 'unlike'].includes(action)) {
    return { success: false, message: 'Missing or invalid itemId/action' }
  }

  const kind = parseLibraryEngagementKind(kindRaw, 'gallery')

  try {
    return await setLibraryLike(event, kind, String(itemId), action)
  } catch (error: unknown) {
    console.error('[API] Failed to process library like/unlike:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
