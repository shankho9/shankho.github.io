import { isAdminOnlyRoute, useAdminAccessGuard } from '~/composables/useAdminAccessGuard'

const POLL_INTERVAL_MS = 30_000

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { enforceAdminAccess } = useAdminAccessGuard()

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const startPolling = () => {
    stopPolling()
    pollTimer = setInterval(() => {
      void enforceAdminAccess()
    }, POLL_INTERVAL_MS)
  }

  const guardRoute = (path: string) => {
    if (!isAdminOnlyRoute(path)) {
      stopPolling()
      return
    }
    void enforceAdminAccess()
    startPolling()
  }

  guardRoute(router.currentRoute.value.path)
  router.afterEach((to) => guardRoute(to.path))
})
