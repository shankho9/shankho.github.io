export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Only check auth on client-side
  // Server-side will be handled by API endpoints
  // Use import.meta.env.SSR to detect server-side rendering (Vite-compatible)
  if (import.meta.env.SSR) {
    return
  }

  const { isAuthenticated, checkAuth, loadStoredUser } = useAuth()

  // Load stored user
  loadStoredUser()

  // Check authentication
  const isAuth = await checkAuth()

  // Require authentication - redirect to login if not authenticated
  if (!isAuth || !isAuthenticated.value) {
    console.warn('[Auth Utilities] Authentication required')
    return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
  }
})
