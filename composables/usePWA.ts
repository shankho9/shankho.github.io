/**
 * Composable for PWA functionality
 * Provides install prompt and offline status
 */
import { onMounted, onUnmounted } from 'vue'

export const usePWA = () => {
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstalled = ref(false)
  const isOnline = ref(true)
  const isInstallable = ref(false)

  // Check if app is already installed
  if (import.meta.client) {
    const navigator = window.navigator as Navigator & { standalone?: boolean }
    isInstalled.value =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true ||
      document.referrer.includes('android-app://')

    isOnline.value = navigator.onLine

    // Listen for install prompt availability
    const handleInstallAvailable = (e: CustomEvent) => {
      installPrompt.value = e.detail
      isInstallable.value = true
    }

    // Listen for installation
    const handleInstalled = () => {
      isInstalled.value = true
      isInstallable.value = false
      installPrompt.value = null
    }

    // Listen for online/offline status
    const handleOnline = () => {
      isOnline.value = true
    }
    const handleOffline = () => {
      isOnline.value = false
    }

    onMounted(() => {
      window.addEventListener('pwa-install-available', handleInstallAvailable as EventListener)
      window.addEventListener('pwa-installed', handleInstalled as EventListener)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Check if install is available from sessionStorage
      if (sessionStorage.getItem('pwa-install-available') === 'true') {
        isInstallable.value = true
      }
    })

    onUnmounted(() => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable as EventListener)
      window.removeEventListener('pwa-installed', handleInstalled as EventListener)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })
  }

  /**
   * Trigger PWA install prompt
   */
  const promptInstall = async (): Promise<boolean> => {
    if (!installPrompt.value) {
      console.warn('[PWA] Install prompt not available')
      return false
    }

    try {
      await installPrompt.value.prompt()
      const choiceResult = await installPrompt.value.userChoice

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt')
        isInstalled.value = true
        isInstallable.value = false
        installPrompt.value = null
        sessionStorage.removeItem('pwa-install-available')
        return true
      } else {
        console.log('[PWA] User dismissed install prompt')
        return false
      }
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error)
      return false
    }
  }

  return {
    installPrompt: readonly(installPrompt),
    isInstalled: readonly(isInstalled),
    isOnline: readonly(isOnline),
    isInstallable: readonly(isInstallable),
    promptInstall,
  }
}

// Type definition for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
