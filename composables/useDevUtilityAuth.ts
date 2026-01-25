/** Shared auth for dev utility pages. Call ensureAuth() in onMounted; redirects if unauthenticated. */
export function useDevUtilityAuth() {
  const { isAuthenticated, checkAuth } = useAuth()
  const route = useRoute()

  async function ensureAuth(): Promise<boolean> {
    await checkAuth()
    if (!isAuthenticated.value) {
      await navigateTo('/auth/login?redirect=' + encodeURIComponent(route.fullPath))
      return false
    }
    return true
  }

  return { isAuthenticated, ensureAuth }
}
