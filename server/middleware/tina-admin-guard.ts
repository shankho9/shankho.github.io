import { getCurrentUser } from '~/server/utils/auth'

/**
 * Restrict Tina admin static UI to site admins only.
 * Tina Cloud auth is a second layer for commits.
 */
export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || ''

  if (!path.startsWith('/admin')) {
    return
  }

  // Allow Tina assets under /admin without re-checking every static chunk if already passed root
  const user = await getCurrentUser(event)
  if (!user || user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required to use the content editor.',
    })
  }
})
