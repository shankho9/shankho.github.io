export default defineNuxtRouteMiddleware(async (_to, _from) => {
  // Only check auth on client-side
  // Server-side will be handled by API endpoints
  if (import.meta.server) {
    return
  }

  // Check admin authentication
  let isAdminAuthenticated = false
  try {
    const adminResponse = await $fetch<{ authenticated: boolean }>('/api/admin/auth')
    isAdminAuthenticated = adminResponse.authenticated
  } catch (error) {
    // Log error for debugging but don't expose details to user
    console.warn('[Auth Planner] Admin auth check failed:', error)
    isAdminAuthenticated = false
  }

  // Check Google authentication
  const { isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()
  initializeGoogleSignIn()
  await loadStoredUser()

  // Require BOTH Google auth AND admin auth
  if (!isAuthenticated.value || !isAdminAuthenticated) {
    // Log which authentication is missing for debugging
    if (!isAuthenticated.value) {
      console.warn('[Auth Planner] Google authentication required')
    }
    if (!isAdminAuthenticated) {
      console.warn('[Auth Planner] Admin authentication required')
    }
    return navigateTo('/dev')
  }
})
