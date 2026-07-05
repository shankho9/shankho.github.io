/** Utility names for admin passcode settings UI. */
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    return { visitor: [], admin: [] }
  }

  const admin =
    user.role === 'admin' ? ['All Utilities (/dev)', 'Admin Users', 'Access Control'] : []

  return { visitor: [], admin }
})
