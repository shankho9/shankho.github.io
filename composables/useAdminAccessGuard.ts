/** Detect routes that require an active admin role (not just login). */
export function isAdminOnlyRoute(path: string): boolean {
  return path.startsWith('/dev') || path.startsWith('/auth/admin-passcode')
}

/**
 * Verify the current user still has admin role. If demoted, sign out and send to home.
 */
export function useAdminAccessGuard() {
  const route = useRoute()

  const enforceAdminAccess = async (): Promise<'ok' | 'redirected'> => {
    const { checkAuth, isAuthenticated, isAdmin, signOut } = useAuth()

    await checkAuth(true)

    if (!isAuthenticated.value) {
      await navigateTo('/auth/login?redirect=' + encodeURIComponent(route.fullPath))
      return 'redirected'
    }

    if (!isAdmin.value) {
      await signOut()
      await navigateTo('/')
      return 'redirected'
    }

    return 'ok'
  }

  return { isAdminOnlyRoute, enforceAdminAccess }
}
