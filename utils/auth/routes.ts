/** Routes that require an authenticated session. */
const PROTECTED_ROUTE_PREFIXES = [
  '/library',
  '/gallery',
  '/personalSpace',
  '/maps',
  '/dev',
  '/admin',
]

/** Auth endpoints where 401 is an expected login failure, not session expiry. */
const AUTH_SKIP_401_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/apple',
  '/api/auth/outlook',
  '/api/auth/github',
  '/api/auth/admin-passcode/verify',
  '/api/auth/password/forgot',
  '/api/auth/password/reset',
]

export function isProtectedAppRoute(path: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

export function isAuthSkip401Url(url: string): boolean {
  return AUTH_SKIP_401_PATHS.some((path) => url.includes(path))
}

export function getUrlPath(url: string | Request): string {
  if (typeof url === 'string') {
    try {
      return new URL(url, 'http://localhost').pathname
    } catch {
      return url
    }
  }
  try {
    return new URL(url.url).pathname
  } catch {
    return url.url
  }
}
