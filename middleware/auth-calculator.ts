export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Only check auth on client-side
  if (import.meta.env.SSR) {
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
      return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
    }
  } catch (error) {
    // If checkAuth fails (network error, etc.), but user is in localStorage,
    // allow access as fallback but still verify when possible
    // This handles race conditions where session cookie might not be immediately available
    if (!isAuthenticated.value) {
      // No user in localStorage and checkAuth failed - redirect to login
      return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
    }
    // User is in localStorage but checkAuth failed - allow access but log the error
    console.warn('[Auth Middleware] Server verification failed, but user in localStorage:', error)
  }
})
