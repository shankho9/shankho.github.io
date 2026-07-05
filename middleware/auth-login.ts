/** Any signed-in user. Use for Library, LifeLines, Gallery. */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const redirectToLogin = () =>
    navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))

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
  loadStoredUser()

  try {
    const isAuth = await checkAuth()
    if (!isAuth || !isAuthenticated.value) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_user')
      }
      return redirectToLogin()
    }
  } catch (error) {
    console.warn('[Auth Login] Server verification failed:', error)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user')
    }
    return redirectToLogin()
  }
})
