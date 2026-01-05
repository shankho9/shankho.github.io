// server/api/admin/cache.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { clearNuxtCache } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await getCurrentUser(event)
  if (!user) {
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
