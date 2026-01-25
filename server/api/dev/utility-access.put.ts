import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { UTILITIES_MANIFEST } from '~/server/utils/utilities-manifest'

const VALID_ROLES = ['visitor', 'admin']

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized' }
  }
  if (user.role !== 'admin') {
    setResponseStatus(event, 403)
    return { error: 'Admin access required' }
  }

  const body =
    await readBody<{ utilityId: string; rolesAllowed: string[]; requiresPasscode?: boolean }[]>(
      event,
    )
  if (!Array.isArray(body)) {
    setResponseStatus(event, 400)
    return { error: 'Body must be an array of { utilityId, rolesAllowed, requiresPasscode? }' }
  }

  const ids = new Set(UTILITIES_MANIFEST.map((u) => u.id))
  for (const item of body) {
    if (!item?.utilityId || !ids.has(item.utilityId)) continue
    const roles = Array.isArray(item.rolesAllowed)
      ? item.rolesAllowed.filter((r) => VALID_ROLES.includes(r))
      : []
    if (roles.length === 0) continue
    const rolesJson = JSON.stringify(roles)
    const passcode = !!item.requiresPasscode
    await query(
      `INSERT INTO utility_access_config (utility_id, roles_allowed, requires_passcode, updated_at)
       VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (utility_id) DO UPDATE SET roles_allowed = $2::jsonb, requires_passcode = $3, updated_at = CURRENT_TIMESTAMP`,
      [item.utilityId, rolesJson, passcode],
    )
  }

  return { success: true }
})
