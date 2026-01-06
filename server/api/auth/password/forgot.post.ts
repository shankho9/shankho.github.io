// server/api/auth/password/forgot.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getUserByEmail, generateToken } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { sendPasswordResetEmail } from '~/server/utils/email'

const RESET_TOKEN_EXPIRY_HOURS = 24 // Token expires in 24 hours

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Email is required' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Invalid email format' }
  }

  try {
    // Check if user exists (but don't reveal if they don't for security)
    const user = await getUserByEmail(email.toLowerCase())

    if (user && user.auth_provider === 'email' && user.password_hash) {
      // Generate reset token
      const resetToken = generateToken(32)
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

      // Store reset token in database
      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
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
      const resetUrl = `${siteUrl}/auth/reset-password?token=${resetToken}`

      console.log('[Auth] Sending password reset email to:', user.email)
      try {
        await sendPasswordResetEmail(user.email, user.name, resetUrl)
        console.log('[Auth] Password reset email sent successfully')
      } catch (emailError) {
        // Log detailed error information for debugging
        console.error('[Auth] Failed to send password reset email:', {
          error: emailError,
          message: emailError instanceof Error ? emailError.message : String(emailError),
          userEmail: user.email,
          stack: emailError instanceof Error ? emailError.stack : undefined,
        })
        // Re-throw to be caught by outer catch block
        throw emailError
      }
    } else {
      console.log(
        '[Auth] Password reset requested for email that does not exist or uses OAuth:',
        email,
      )
    }

    // Always return success to prevent email enumeration
    // If user doesn't exist or uses OAuth, we still return success
    return { success: true }
  } catch (error) {
    // Log detailed error information for debugging
    console.error('[Auth] Password reset request error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      email,
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Log the error but still return success to prevent email enumeration
    // The error is logged for debugging, but we don't reveal to the user
    // whether the email was sent or not for security reasons
    return { success: true }
  }
})
