/** Utility names per passcode (settings UI). */
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { UTILITIES_MANIFEST } from '~/server/utils/utilities-manifest'

const ADMIN_PASSCODE_UTILITIES = [
  'Visitor Analytics',
  'Analytics Dashboard',
  'Email Logs',
  'Utility Access Control',
]

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    return { visitor: [], admin: [] }
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
    console.warn('[passcode-utilities] config fetch failed:', e)
  }

  const ids = new Set(UTILITIES_MANIFEST.map((u) => u.id))
  const visitor: string[] = []
  for (const r of rows) {
    if (!ids.has(r.utility_id) || !r.requires_passcode) continue
    const roles = Array.isArray(r.roles_allowed)
      ? (r.roles_allowed as string[])
      : ((typeof r.roles_allowed === 'string' ? JSON.parse(r.roles_allowed) : []) as string[])
    if (!roles.includes(role)) continue
    const u = UTILITIES_MANIFEST.find((m) => m.id === r.utility_id)
    if (u) visitor.push(u.name)
  }

  const admin: string[] = user.role === 'admin' ? [...ADMIN_PASSCODE_UTILITIES] : []

  return { visitor, admin }
})
