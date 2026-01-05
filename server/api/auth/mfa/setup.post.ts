// server/api/auth/mfa/setup.post.ts
import { readBody, setResponseStatus } from 'h3'
import {
  getCurrentUser,
  generateMFASecret,
  generateMFAQRCode,
  verifyMFACode,
} from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  const body = await readBody(event)
  const { action } = body

  if (action === 'generate') {
    // Generate new MFA secret
    const secret = generateMFASecret(user.email)
    const qrCode = await generateMFAQRCode(user.email, secret)

    // Store secret temporarily (user needs to verify before enabling)
    // In production, you might want to store this in a temporary cache
    return {
      success: true,
      secret,
      qrCode,
      message: 'Scan the QR code with your authenticator app and verify with a code to enable MFA',
    }
  }

  if (action === 'verify') {
    // Verify code and enable MFA
    const { secret, code: verificationCode } = body

    if (!secret || !verificationCode) {
      setResponseStatus(event, 400)
      return { success: false, error: 'Secret and verification code are required' }
    }

    const isValid = verifyMFACode(secret, verificationCode)
    if (!isValid) {
      setResponseStatus(event, 400)
      return { success: false, error: 'Invalid verification code' }
    }

    // Enable MFA for user
    await query('UPDATE users SET mfa_secret = $1, mfa_enabled = true WHERE id = $2', [
      secret,
      user.id,
    ])

    return { success: true, message: 'MFA enabled successfully' }
  }

  if (action === 'disable') {
    // Disable MFA
    await query('UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = $1', [user.id])

    return { success: true, message: 'MFA disabled successfully' }
  }

  setResponseStatus(event, 400)
  return { success: false, error: 'Invalid action' }
})
