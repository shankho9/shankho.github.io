/** Admin-only route guard for Tina CMS admin UI pages. */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.env.SSR) {
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<{ authenticated: boolean; user?: { role: string } }>(
        '/api/auth/me',
        { headers },
      )
      if (!response?.authenticated || response.user?.role !== 'admin') {
        return navigateTo('/?error=admin-required')
      }
    } catch {
      return navigateTo('/auth/login?redirect=/admin')
    }
    return
  }

  const { checkAuth, isAdmin, loadStoredUser } = useAuth()
  loadStoredUser()
  try {
    await checkAuth()
  } catch {
    // fall through
  }
  if (!isAdmin.value) {
    return navigateTo('/?error=admin-required')
  }
})
