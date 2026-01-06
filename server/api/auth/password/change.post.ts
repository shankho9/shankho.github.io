// server/api/auth/password/change.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser, getUserByEmail, verifyPassword, hashPassword } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  if (user.auth_provider !== 'email') {
    setResponseStatus(event, 400)
    return { success: false, error: 'Password change is only available for email accounts' }
  }

  const body = await readBody(event)
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Current password and new password are required' }
  }

  if (newPassword.length < 8) {
    setResponseStatus(event, 400)
    return { success: false, error: 'New password must be at least 8 characters long' }
  }

  try {
    // Get full user data with password hash
    const fullUser = await getUserByEmail(user.email)
    if (!fullUser || !fullUser.password_hash) {
      setResponseStatus(event, 400)
      return { success: false, error: 'User not found or password not set' }
    }

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, fullUser.password_hash)
    if (!passwordValid) {
      setResponseStatus(event, 401)
      return { success: false, error: 'Current password is incorrect' }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, user.id])

    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    console.error('[Auth] Password change error:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Failed to update password' }
  }
})
