export default defineNuxtRouteMiddleware(async (_to, _from) => {
  // Only check auth on client-side
  // Server-side will be handled by API endpoints
  if (import.meta.server) {
    return
  }

  // Check admin authentication using cached state (non-blocking if cached)
  const { checkAuth } = useAdminAuth()

  // Start auth check (will use cache if available, won't block)
  const authCheckPromise = checkAuth()

  // Check Google authentication (synchronous - just loads from storage)
  const { isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()
  initializeGoogleSignIn()
  await loadStoredUser()

  // Wait for admin auth check to complete (should be fast if cached)
  const isAdminAuth = await authCheckPromise

  // Require BOTH Google auth AND admin auth
  if (!isAuthenticated.value || !isAdminAuth) {
    // Log which authentication is missing for debugging
    if (!isAuthenticated.value) {
      console.warn('[Auth Planner] Google authentication required')
    }
    if (!isAdminAuth) {
      console.warn('[Auth Planner] Admin authentication required')
    }
    return navigateTo('/dev')
  }
})
