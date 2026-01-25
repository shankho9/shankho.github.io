import {
  getCurrentUser,
  needsAdminPasscodeRotation,
  getAdminPasscodeExpiry,
} from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    return { authenticated: false, isSet: false, needsRotation: false, expiresAt: null }
  }
  if (user.role !== 'admin') {
    return { authenticated: true, isSet: false, needsRotation: false, expiresAt: null }
  }

  const rows = await query<{ id: number }>('SELECT id FROM admin_passcodes WHERE user_id = $1', [
    user.id,
  ])
  const isSet = rows.length > 0
  const needsRotation = await needsAdminPasscodeRotation(user.id)
  const expiresAt = await getAdminPasscodeExpiry(user.id)

  return {
    authenticated: true,
    isSet,
    needsRotation,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  }
})
