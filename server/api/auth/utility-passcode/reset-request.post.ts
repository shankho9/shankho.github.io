// server/api/auth/utility-passcode/reset-request.post.ts
import { setResponseStatus } from 'h3'
import { getCurrentUser, generateToken } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { sendPasscodeResetEmail } from '~/server/utils/email'

const RESET_TOKEN_EXPIRY_HOURS = 24 // Token expires in 24 hours

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user has a passcode set
  const passcodeResult = await query<{ id: number }>(
    'SELECT id FROM utility_passcodes WHERE user_id = $1',
    [user.id],
  )

  if (passcodeResult.length === 0) {
    setResponseStatus(event, 400)
    return { success: false, error: 'No passcode set for this account' }
  }

  try {
    // Generate reset token
    const resetToken = generateToken(32)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    // Store reset token in database using utility_passcode_reset_tokens table
    await query(
      `INSERT INTO utility_passcode_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [user.id, resetToken, expiresAt],
    )

    // Send reset email
    const config = useRuntimeConfig()
    const siteUrl =
      config.public.siteUrl ||
      process.env.NUXT_PUBLIC_SITE_URL ||
      'https://shankho-blogsite.vercel.app'
    const resetUrl = `${siteUrl}/auth/passcode-reset?token=${resetToken}`

    console.log('[Auth] Sending utility passcode reset email to:', user.email)
    await sendPasscodeResetEmail(user.email, user.name, resetUrl)
    console.log('[Auth] Utility passcode reset email sent successfully')

    return { success: true, message: 'Passcode reset link sent to your email.' }
  } catch (error) {
    console.error('[Auth] Passcode reset request error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send passcode reset link.'
    setResponseStatus(event, 500)
    return { success: false, error: errorMessage }
  }
})
