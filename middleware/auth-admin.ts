/** Admin-only: auth + admin role + admin passcode. Use for all /dev routes. */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const redirectToLogin = () =>
    navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))

  if (import.meta.env.SSR) {
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<{ authenticated: boolean; user?: { role: string } }>(
        '/api/auth/me',
        { headers },
      )
      if (!response?.authenticated) return redirectToLogin()
      if (response.user?.role !== 'admin') return navigateTo('/')
    } catch {
      return redirectToLogin()
    }
    return
  }

  const { isAuthenticated, isAdmin, checkAuth, loadStoredUser } = useAuth()
  loadStoredUser()

  try {
    const isAuth = await checkAuth()
    if (!isAuth || !isAuthenticated.value) {
      if (typeof window !== 'undefined') localStorage.removeItem('auth_user')
      return redirectToLogin()
    }
  } catch (error) {
    if (!isAuthenticated.value) {
      return redirectToLogin()
    }
    console.warn('[Auth Admin] Server verification failed, but user in localStorage:', error)
  }

  if (!isAdmin.value) return navigateTo('/')

  let passcodeStatus: {
    authenticated: boolean
    isSet: boolean
    needsRotation: boolean
    expiresAt: string | null
  } | null = null
  let apiCallFailed = false

  try {
    passcodeStatus = await $fetch<{
      authenticated: boolean
      isSet: boolean
      needsRotation: boolean
      expiresAt: string | null
    }>('/api/auth/admin-passcode/status')
  } catch {
    apiCallFailed = true
  }

  const passcodeVerified = sessionStorage.getItem('admin_passcode_verified')

  if (apiCallFailed) {
    if (!passcodeVerified) {
      return navigateTo(
        '/auth/settings?passcode=admin-setup&redirect=' + encodeURIComponent(to.fullPath),
      )
    }
    return
  }

  if (passcodeStatus) {
    if (!passcodeStatus.isSet) {
      return navigateTo('/auth/settings?passcode=admin-setup')
    }
    if (passcodeStatus.needsRotation) {
      return navigateTo('/auth/settings?passcode=admin-rotate')
    }
  }

  if (!passcodeVerified) {
    return navigateTo('/auth/admin-passcode?redirect=' + encodeURIComponent(to.fullPath))
  }
})
