/**
 * Canonical-host redirect: old Vercel preview domain → production domain.
 * Runs on every request (API + pages) so OAuth/login on the old host
 * lands on www.nomadic-notions.co.in with path + query preserved.
 *
 * Primary redirect should also be configured in vercel.json (edge).
 * This middleware is the app-level fallback.
 */
const LEGACY_HOSTS = new Set(['shankho-blogsite.vercel.app'])

const CANONICAL_ORIGIN = 'https://www.nomadic-notions.co.in'

export default defineEventHandler((event) => {
  const hostHeader = getRequestHeader(event, 'host')
  if (!hostHeader) return

  const host = hostHeader.split(':')[0]?.toLowerCase()
  if (!host || !LEGACY_HOSTS.has(host)) return

  const url = getRequestURL(event)
  const destination = `${CANONICAL_ORIGIN}${url.pathname}${url.search}`

  return sendRedirect(event, destination, 308)
})
