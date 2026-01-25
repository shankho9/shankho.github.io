/** Utility access + passcode check. Skips /dev, access-control. Run after auth. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.env.SSR) return
  const path = to.path
  if (path === '/dev' || path === '/dev/' || path === '/dev/utilities/access-control') return
  if (!path.startsWith('/dev/')) return

  try {
    const res = await $fetch<{ allowed: boolean; requiresPasscode?: boolean }>(
      '/api/dev/utility-access/allowed?route=' + encodeURIComponent(path),
    )
    if (!res.allowed) {
      return navigateTo('/dev')
    }
    if (res.requiresPasscode) {
      const passcodeVerified = sessionStorage.getItem('utility_passcode_verified')
      if (!passcodeVerified) {
        return navigateTo('/auth/utility-passcode?redirect=' + encodeURIComponent(path))
      }
    }
  } catch {
    return navigateTo('/dev')
  }
})
