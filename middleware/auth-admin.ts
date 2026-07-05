/** Admin-only: auth + admin role + admin passcode. Use for all /dev routes. */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  const redirectToLogin = () =>
    navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))

  const redirectToPasscode = (extraQuery?: Record<string, string>) =>
    navigateTo({
      path: '/auth/admin-passcode',
      query: {
        redirect: to.fullPath,
        ...extraQuery,
      },
    })

  if (import.meta.env.SSR) {
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<{ authenticated: boolean; user?: { role: string } }>(
        '/api/auth/me',
        { headers },
      )
      if (!response?.authenticated) return redirectToLogin()
      if (response.user?.role !== 'admin') {
        try {
          await $fetch('/api/auth/logout', { method: 'POST', headers })
        } catch {
          // Session may already be invalid
        }
        return navigateTo('/')
      }
    } catch {
      return redirectToLogin()
    }
    return
  }

  const { enforceAdminAccess } = useAdminAccessGuard()
  const access = await enforceAdminAccess()
  if (access === 'redirected') return

  let passcodeStatus: {
    authenticated: boolean
    isSet: boolean
    needsRotation: boolean
    expiresAt: string | null
    error?: string
  } | null = null
  let apiCallFailed = false

  try {
    passcodeStatus = await $fetch<{
      authenticated: boolean
      isSet: boolean
      needsRotation: boolean
      expiresAt: string | null
      error?: string
    }>('/api/auth/admin-passcode/status')
    if (passcodeStatus.error) {
      apiCallFailed = true
    }
  } catch {
    apiCallFailed = true
  }

  const passcodeVerified =
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem('admin_passcode_verified') === 'true'

  // If status API failed but user already verified this session, allow access
  if (apiCallFailed) {
    if (!passcodeVerified) {
      return redirectToPasscode({ setup: 'unknown' })
    }
    return
  }

  if (passcodeStatus) {
    if (!passcodeStatus.isSet) {
      return navigateTo({
        path: '/auth/settings',
        query: {
          passcode: 'admin-setup',
          redirect: to.fullPath,
        },
      })
    }
    if (passcodeStatus.needsRotation) {
      return navigateTo({
        path: '/auth/admin-passcode-rotate',
        query: { redirect: to.fullPath },
      })
    }
  }

  if (!passcodeVerified) {
    return redirectToPasscode()
  }
})
