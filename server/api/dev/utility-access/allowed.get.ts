import { getQuery, setResponseStatus } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { UTILITIES_MANIFEST, getUtilityIdByRoute } from '~/server/utils/utilities-manifest'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { allowed: [], error: 'Unauthorized' }
  }

  if (user.role !== 'admin') {
    const q = getQuery(event)
    const route = (q.route as string)?.trim()
    if (route) {
      return { allowed: false }
    }
    return { allowed: [] }
  }

  const allIds = UTILITIES_MANIFEST.map((u) => u.id)
  const q = getQuery(event)
  const route = (q.route as string)?.trim()
  if (route) {
    const uid = getUtilityIdByRoute(route)
    return { allowed: !!uid && allIds.includes(uid) }
  }

  return { allowed: allIds }
})
