// server/api/admin/auth.get.ts
import { verifyAdminToken, is2FAConfigured } from '~/server/utils/adminAuth'

export default defineEventHandler(async (event) => {
  const isAuthenticated = verifyAdminToken(event)
  return { authenticated: isAuthenticated, requires2FA: is2FAConfigured() }
})
