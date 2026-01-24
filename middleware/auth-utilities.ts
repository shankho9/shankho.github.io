export default defineNuxtRouteMiddleware(async (to, _from) => {
  const redirectToLogin = () =>
    navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))

  // SSR: verify auth using request cookies so protected pages don't "half render" then redirect.
  if (import.meta.env.SSR) {
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<{ authenticated: boolean }>('/api/auth/me', { headers })
      if (!response?.authenticated) return redirectToLogin()
    } catch {
      return redirectToLogin()
    }
    return
  }

  const { isAuthenticated, checkAuth, loadStoredUser } = useAuth()

  // Load stored user from localStorage first
  loadStoredUser()

  // Always verify with server to ensure session is still valid
  // This prevents revoked sessions from accessing protected routes
  try {
    const isAuth = await checkAuth()

    // If server says user is not authenticated, clear localStorage and redirect
    if (!isAuth || !isAuthenticated.value) {
      // Clear potentially stale localStorage data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_user')
      }
      return redirectToLogin()
    }
  } catch (error) {
    // If checkAuth fails (network error, etc.), but user is in localStorage,
    // allow access as fallback but still verify when possible
    // This handles race conditions where session cookie might not be immediately available
    if (!isAuthenticated.value) {
      // No user in localStorage and checkAuth failed - redirect to login
      return redirectToLogin()
    }
    // User is in localStorage but checkAuth failed - allow access but log the error
    console.warn('[Auth Middleware] Server verification failed, but user in localStorage:', error)
  }
})
