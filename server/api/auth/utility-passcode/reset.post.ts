// server/api/auth/utility-passcode/reset.post.ts
import { readBody, setResponseStatus } from 'h3'
import { setUtilityPasscode } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token, newPasscode } = body

  if (!token || !newPasscode) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Token and new passcode are required' }
  }

  if (newPasscode.length < 6) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Passcode must be at least 6 characters long' }
  }

  try {
    // Find valid reset token from utility_passcode_reset_tokens table
    const result = await query<{
      id: number
      user_id: number
      token: string
      expires_at: Date
    }>(
      `SELECT id, user_id, token, expires_at
       FROM utility_passcode_reset_tokens
       WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token],
    )

    if (result.length === 0) {
      setResponseStatus(event, 400)
      return { success: false, error: 'Invalid or expired reset token' }
    }

    const resetToken = result[0]
    const userId = resetToken.user_id

    // Set new passcode
    await setUtilityPasscode(userId, newPasscode)

    // Delete used reset token
    await query('DELETE FROM utility_passcode_reset_tokens WHERE id = $1', [resetToken.id])

    return { success: true, message: 'Utility passcode reset successfully.' }
  } catch (error) {
    console.error('[Auth] Passcode reset error:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to reset passcode. Please try again.' }
  }
})
