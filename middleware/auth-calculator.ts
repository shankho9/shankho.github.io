export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Only check auth on client-side
  if (import.meta.env.SSR) {
    return
  }

  const { isAuthenticated, checkAuth, loadStoredUser } = useAuth()

  // Load stored user from localStorage first
  loadStoredUser()

  // If user is already authenticated in localStorage, allow access
  // This handles cases where session cookie might not be immediately available
  // but the user is legitimately logged in
  if (isAuthenticated.value) {
    // Still verify with server, but don't block if localStorage has user
    checkAuth().catch(() => {
      // Silently fail - user is in localStorage, allow access
    })
    return
  }

  // Check authentication with server
  const isAuth = await checkAuth()

  // Require authentication - redirect to login if not authenticated
  if (!isAuth || !isAuthenticated.value) {
    return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
  }
})
