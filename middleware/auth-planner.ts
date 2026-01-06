export default defineNuxtRouteMiddleware(async (_to, _from) => {
  // Only check auth on client-side
  // Server-side will be handled by API endpoints
  if (import.meta.server) {
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
  let passcodeStatus
  try {
    passcodeStatus = await $fetch<{
      authenticated: boolean
      isSet: boolean
      needsRotation: boolean
      expiresAt: string | null
    }>('/api/auth/utility-passcode/status')
  } catch (error) {
    // If API call fails, log and continue (don't block navigation)
    // User will be prompted for passcode if needed
    console.warn('[Auth Planner] Failed to check passcode status:', error)
    passcodeStatus = { authenticated: false, isSet: false, needsRotation: false, expiresAt: null }
  }

  // If passcode is not set, redirect to settings to set it up
  if (!passcodeStatus.isSet) {
    return navigateTo('/auth/settings?passcode=setup')
  }

  // If passcode needs rotation, redirect to settings
  if (passcodeStatus.needsRotation) {
    return navigateTo('/auth/settings?passcode=rotate')
  }

  // Check if utility passcode is verified in session
  // This flag is set in pages/auth/utility-passcode.vue after successful verification
  const passcodeVerified = sessionStorage.getItem('utility_passcode_verified')

  if (!passcodeVerified) {
    // Redirect to passcode verification page
    return navigateTo('/auth/utility-passcode?redirect=' + encodeURIComponent(_to.fullPath))
  }
})
