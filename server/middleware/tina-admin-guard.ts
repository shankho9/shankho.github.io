import { getRequestURL, getRequestHeader, sendRedirect } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * Restrict Tina admin static UI to site admins only.
 * Tina Cloud auth is a second layer for commits.
 *
 * Assets under /admin/assets/ stay public so the SPA can load JS/CSS even when
 * a short-lived cookie race would otherwise 403 module fetches. The HTML entry
 * and API remain admin-gated; writes still require Tina Cloud login.
 */
export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname || ''

  if (!pathname.startsWith('/admin')) {
    return
  }

  // Bundled Tina assets are not secret; gating them causes 403s that look like
  // a broken/404 editor when index.html loaded but modules did not.
  if (pathname.startsWith('/admin/assets/')) {
    return
  }

  const user = await getCurrentUser(event)
  const isAdmin = user?.role === 'admin'

  if (isAdmin) {
    return
  }

  const accept = getRequestHeader(event, 'accept') || ''
  const isDocument =
    accept.includes('text/html') ||
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname.endsWith('.html')

  if (isDocument) {
    if (user) {
      return sendRedirect(event, '/?error=admin-required', 302)
    }
    const redirectTarget = `/auth/login?redirect=${encodeURIComponent(pathname)}`
    return sendRedirect(event, redirectTarget, 302)
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Admin access required to use the content editor.',
  })
})
