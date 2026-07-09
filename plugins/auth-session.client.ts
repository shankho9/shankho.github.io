import { getFetchErrorStatus } from '~/utils/common/fetchError'
import { getUrlPath, isAuthSkip401Url } from '~/utils/auth/routes'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

let isHandlingSessionExpiry = false

export default defineNuxtPlugin((nuxtApp) => {
  const { checkAuth, handleSessionExpired, isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    void checkAuth(true)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  const handleOnline = () => {
    void checkAuth(true)
  }

  window.addEventListener('online', handleOnline)

  window.addEventListener('offline', () => {
    showToast('You are offline. Some content may be outdated.', 'warning', 5000, {
      id: 'offline-toast',
    })
  })

  const originalFetch = globalThis.$fetch
  const fetchWithAuthHandling = originalFetch.create({
    onResponseError({ request, response }) {
      if (response.status !== 401) return

      const urlPath = getUrlPath(request)
      if (isAuthSkip401Url(urlPath)) return
      if (!isAuthenticated.value) return
      if (isHandlingSessionExpiry) return

      isHandlingSessionExpiry = true
      void handleSessionExpired().finally(() => {
        isHandlingSessionExpiry = false
      })
    },
  })

  globalThis.$fetch = fetchWithAuthHandling as typeof globalThis.$fetch

  nuxtApp.hook('vue:error', (error) => {
    const statusCode = getFetchErrorStatus(error)
    if (statusCode === 401 && isAuthenticated.value) {
      void handleSessionExpired()
    }
  })
})
