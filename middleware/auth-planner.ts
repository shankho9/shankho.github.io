export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

  // Initialize Google Sign-In and load stored user on client
  if (import.meta.client) {
    await initializeGoogleSignIn()
    await loadStoredUser()
  }

  // Check authentication status
  if (!isAuthenticated.value) {
    return navigateTo('/')
  }
})
