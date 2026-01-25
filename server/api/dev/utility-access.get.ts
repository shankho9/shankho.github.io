import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'
import { UTILITIES_MANIFEST } from '~/server/utils/utilities-manifest'

interface ConfigRow {
  utility_id: string
  roles_allowed: string[]
  requires_passcode: boolean
}

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

  let rows: ConfigRow[] = []
  try {
    const result = await query<{
      utility_id: string
      roles_allowed: unknown
      requires_passcode: boolean
    }>(
      'SELECT utility_id, roles_allowed, COALESCE(requires_passcode, false) AS requires_passcode FROM utility_access_config',
    )
    rows = result.map((r) => ({
      utility_id: r.utility_id,
      roles_allowed: Array.isArray(r.roles_allowed)
        ? (r.roles_allowed as string[])
        : ((typeof r.roles_allowed === 'string' ? JSON.parse(r.roles_allowed) : []) as string[]),
      requires_passcode: !!r.requires_passcode,
    }))
  } catch (e) {
    console.warn('[dev/utility-access] config fetch failed:', e)
  }

  const config = new Map<string, { roles: string[]; passcode: boolean }>()
  for (const r of rows) {
    config.set(r.utility_id, { roles: r.roles_allowed, passcode: r.requires_passcode })
  }

  const utilities = UTILITIES_MANIFEST.map((u) => {
    const c = config.get(u.id)
    return {
      ...u,
      rolesAllowed: c?.roles ?? ['visitor', 'admin'],
      requiresPasscode: c?.passcode ?? false,
    }
  })

  return { utilities }
})
