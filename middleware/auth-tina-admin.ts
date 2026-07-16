/** Admin-only route guard for Tina CMS admin UI pages. */
export default defineNuxtRouteMiddleware(async (to) => {
  const redirectTarget = `/admin${to.hash || ''}`
  const loginPath = `/auth/login?redirect=${encodeURIComponent(redirectTarget)}`

  if (import.meta.env.SSR) {
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<{ authenticated: boolean; user?: { role: string } }>(
        '/api/auth/me',
        { headers },
      )
      if (!response?.authenticated) {
        return navigateTo(loginPath)
      }
      if (response.user?.role !== 'admin') {
        return navigateTo('/?error=admin-required')
      }
    } catch {
      return navigateTo(loginPath)
    }
    return
  }

  const { checkAuth, isAdmin, isAuthenticated, loadStoredUser } = useAuth()
  loadStoredUser()
  try {
    await checkAuth(true)
  } catch {
    // fall through
  }
  if (!isAuthenticated.value) {
    return navigateTo(loginPath)
  }
  if (!isAdmin.value) {
    return navigateTo('/?error=admin-required')
  }
})
