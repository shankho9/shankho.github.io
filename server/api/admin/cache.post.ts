// server/api/admin/cache.post.ts
import { readBody, setResponseStatus } from 'h3'
import { verifyAdminToken } from '~/server/utils/adminAuth'
import { clearNuxtCache } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  // Verify admin authentication
  if (!verifyAdminToken(event)) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized' }
  }

  const body = await readBody(event)
  const { action } = body

  if (action === 'clear') {
    const result = await clearNuxtCache()
    if (result.success) {
      return { success: true, message: result.message }
    } else {
      setResponseStatus(event, 500)
      return { success: false, error: result.message }
    }
  }

  setResponseStatus(event, 400)
  return { success: false, error: 'Invalid action. Use "clear"' }
})
