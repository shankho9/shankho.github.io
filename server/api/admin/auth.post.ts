// server/api/admin/auth.post.ts
import { readBody, setResponseStatus } from 'h3'
import { verifyAdminPassword, setAdminToken } from '~/server/utils/adminAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password, totpCode } = body

  if (!password) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Password is required' }
  }

  const result = await verifyAdminPassword(password, totpCode || null)

  if (!result.valid) {
    setResponseStatus(event, 401)
    if (result.requires2FA) {
      return { success: false, error: '2FA code required', requires2FA: true }
    }
    return {
      success: false,
      error: 'Invalid password or 2FA code',
      requires2FA: result.requires2FA,
    }
  }

  if (!result.token) {
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to generate token' }
  }

  setAdminToken(event, result.token)

  return { success: true, token: result.token }
})
