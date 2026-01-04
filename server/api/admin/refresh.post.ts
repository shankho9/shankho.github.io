// server/api/admin/refresh.post.ts
import { verifyAdminToken, extendAdminToken } from '~/server/utils/adminAuth'

export default defineEventHandler(async (event) => {
  const isAuthenticated = verifyAdminToken(event)
  
  if (!isAuthenticated) {
    return { success: false, error: 'Not authenticated' }
  }

  // Extend the token expiry
  const tokenExpiresAt = extendAdminToken(event)
  
  if (!tokenExpiresAt) {
    return { success: false, error: 'Failed to extend token' }
  }

  return { success: true, tokenExpiresAt }
})
