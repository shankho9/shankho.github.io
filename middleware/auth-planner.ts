export default defineNuxtRouteMiddleware(async (_to, _from) => {
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

  // Require authentication
  if (!isAuth || !isAuthenticated.value) {
    console.warn('[Auth Planner] Authentication required')
    return navigateTo('/auth/login?redirect=' + encodeURIComponent(_to.fullPath))
  }

  // Check utility passcode status
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
    }>('/api/auth/utility-passcode/status')
  } catch (error) {
    // If API call fails, log but don't assume passcode is not set
    // This prevents false redirects when the API is temporarily unavailable
    console.warn('[Auth Planner] Failed to check passcode status:', error)
    apiCallFailed = true
  }

  // Check if utility passcode is verified in session
  // This flag is set in pages/auth/utility-passcode.vue after successful verification
  const passcodeVerified = sessionStorage.getItem('utility_passcode_verified')

  // If API call failed, use fail-open approach:
  // - If passcode was previously verified (sessionStorage flag exists), allow access
  // - If not verified, redirect to settings (not verification) to avoid dead-end
  //   Settings page can handle both setup and verification flows
  if (apiCallFailed) {
    if (!passcodeVerified) {
      console.warn(
        '[Auth Planner] API call failed and passcode not verified, redirecting to settings',
      )
      // Redirect to settings which can handle both setup and verification
      // This prevents dead-end where user is sent to verification page without a passcode set
      return navigateTo(
        '/auth/settings?passcode=setup&redirect=' + encodeURIComponent(_to.fullPath),
      )
    }
    // If passcode was verified before, allow access even if API is down
    console.warn('[Auth Planner] API call failed but passcode previously verified, allowing access')
    return
  }

  // API call succeeded - check passcode requirements
  if (passcodeStatus) {
    // If passcode is not set, redirect to settings to set it up
    if (!passcodeStatus.isSet) {
      return navigateTo('/auth/settings?passcode=setup')
    }

    // If passcode needs rotation, redirect to settings
    if (passcodeStatus.needsRotation) {
      return navigateTo('/auth/settings?passcode=rotate')
    }
  }

  // If passcode is set and doesn't need rotation, check if it's verified
  if (!passcodeVerified) {
    // Redirect to passcode verification page
    return navigateTo('/auth/utility-passcode?redirect=' + encodeURIComponent(_to.fullPath))
  }
})
