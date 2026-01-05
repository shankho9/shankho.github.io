// server/api/auth/password/reset.post.ts
import { readBody, setResponseStatus } from 'h3'
import { hashPassword } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, password } = body

  if (!token || !password) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Token and password are required' }
  }

  // Validate password strength
  if (password.length < 8) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Password must be at least 8 characters long' }
  }

  try {
    // Find valid reset token
    const result = await query<{
      id: number
      user_id: number
      token: string
      expires_at: Date
    }>(
      `SELECT id, user_id, token, expires_at
       FROM password_reset_tokens
       WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token],
    )

    if (result.rows.length === 0) {
      setResponseStatus(event, 400)
      return { success: false, error: 'Invalid or expired reset token' }
    }

    const resetToken = result.rows[0]

    // Get user
    const userResult = await query<{
      id: number
      email: string
      auth_provider: string
      password_hash: string | null
    }>('SELECT id, email, auth_provider, password_hash FROM users WHERE id = $1', [
      resetToken.user_id,
    ])

    if (userResult.rows.length === 0) {
      setResponseStatus(event, 404)
      return { success: false, error: 'User not found' }
    }

    const user = userResult.rows[0]

    // Check if user can reset password (must be email-based auth)
    if (user.auth_provider !== 'email' || !user.password_hash) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Password reset is only available for email-based accounts',
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id])

    // Delete used reset token
    await query('DELETE FROM password_reset_tokens WHERE id = $1', [resetToken.id])

    // Revoke all existing sessions for security
    await query('UPDATE sessions SET revoked = true WHERE user_id = $1', [user.id])

    return { success: true }
  } catch (error) {
    console.error('[Auth] Password reset error:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to reset password. Please try again.' }
  }
})
