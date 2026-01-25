import { getQuery, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { UTILITIES_MANIFEST, getUtilityIdByRoute } from '~/server/utils/utilities-manifest'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { allowed: [], error: 'Unauthorized' }
  }

  const role = user.role === 'admin' ? 'admin' : 'visitor'
  let rows: { utility_id: string; roles_allowed: unknown; requires_passcode: boolean }[] = []
  try {
    rows = await query<{
      utility_id: string
      roles_allowed: unknown
      requires_passcode: boolean
    }>(
      'SELECT utility_id, roles_allowed, COALESCE(requires_passcode, false) AS requires_passcode FROM utility_access_config',
    )
  } catch (e) {
    console.warn('[dev/utility-access/allowed] config fetch failed:', e)
  }

  const ids = new Set(UTILITIES_MANIFEST.map((u) => u.id))
  const allowedList: string[] = []
  const passcodeRequired: string[] = []
  for (const r of rows) {
    if (!ids.has(r.utility_id)) continue
    const roles = Array.isArray(r.roles_allowed)
      ? (r.roles_allowed as string[])
      : ((typeof r.roles_allowed === 'string' ? JSON.parse(r.roles_allowed) : []) as string[])
    if (roles.includes(role)) allowedList.push(r.utility_id)
    if (r.requires_passcode) passcodeRequired.push(r.utility_id)
  }

  const configured = new Set(rows.map((r) => r.utility_id))
  for (const u of UTILITIES_MANIFEST) {
    if (!configured.has(u.id)) {
      allowedList.push(u.id)
      // default: no passcode for unconfigured
    }
  }
  const allowed = [...new Set(allowedList)]

  const q = getQuery(event)
  const route = (q.route as string)?.trim()
  if (route) {
    const uid = getUtilityIdByRoute(route)
    const ok = !!uid && allowed.includes(uid)
    const reqPass = !!uid && passcodeRequired.includes(uid)
    return { allowed: ok, requiresPasscode: reqPass }
  }

  return { allowed, passcodeRequired }
})
