export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Only check auth on client-side
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
    console.warn('[Auth Calculator] Authentication required')
    return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
  }
})
