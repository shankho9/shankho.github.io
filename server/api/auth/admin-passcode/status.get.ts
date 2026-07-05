import {
  getCurrentUser,
  needsAdminPasscodeRotation,
  getAdminPasscodeExpiry,
} from '~/server/utils/auth'
import { ensureAdminPasscodesTable } from '~/server/utils/ensureAdminPasscodes'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const user = await getCurrentUser(event)
    if (!user) {
      return { authenticated: false, isSet: false, needsRotation: false, expiresAt: null }
    }
    if (user.role !== 'admin') {
      return { authenticated: true, isSet: false, needsRotation: false, expiresAt: null }
    }

    await ensureAdminPasscodesTable()

    const rows = await query<{ id: number }>(
      'SELECT id FROM admin_passcodes WHERE user_id::text = $1',
      [String(user.id)],
    )
    const isSet = rows.length > 0
    const needsRotation = isSet ? await needsAdminPasscodeRotation(user.id) : false
    const expiresAt = await getAdminPasscodeExpiry(user.id)

    return {
      authenticated: true,
      isSet,
      needsRotation,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    }
  } catch (error) {
    console.error('[Admin Passcode Status] Error:', error)
    return {
      authenticated: false,
      isSet: false,
      needsRotation: false,
      expiresAt: null,
      error: 'Unable to check admin passcode status',
    }
  }
})
