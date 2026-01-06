// server/api/auth/utility-passcode/status.get.ts
import {
  getCurrentUser,
  needsUtilityPasscodeRotation,
  getUtilityPasscodeExpiry,
} from '~/server/utils/auth'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    return { authenticated: false, needsRotation: false, expiresAt: null, isSet: false }
  }

  // Check if passcode is set
  const passcodeResult = await query<{ id: number }>(
    'SELECT id FROM utility_passcodes WHERE user_id = $1',
    [user.id],
  )
  const isSet = passcodeResult.length > 0

  const needsRotation = await needsUtilityPasscodeRotation(user.id)
  const expiresAt = await getUtilityPasscodeExpiry(user.id)

  return {
    authenticated: true,
    isSet,
    needsRotation,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  }
})
