// server/api/admin/auth.get.ts
import { verifyAdminToken, is2FAConfigured, getTokenExpiry } from '~/server/utils/adminAuth'

export default defineEventHandler(async (event) => {
  const isAuthenticated = verifyAdminToken(event)
  const tokenExpiresAt = isAuthenticated ? getTokenExpiry(event) : null
  return {
    authenticated: isAuthenticated,
    requires2FA: is2FAConfigured(),
    tokenExpiresAt, // Return actual token expiry timestamp
  }
})
