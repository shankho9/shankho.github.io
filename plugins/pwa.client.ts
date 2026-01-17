/**
 * PWA Plugin - Registers Service Worker and Handles Install Prompt
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to reload
                  console.log('[PWA] New service worker available')
                  // You could show a toast notification here
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })

      // Listen for service worker controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker controller changed')
        // Reload page when new service worker takes control
        window.location.reload()
      })
    })
  }

  // Handle Install Prompt (beforeinstallprompt event)
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent
    console.log('[PWA] Install prompt available')

    // Store in sessionStorage for use in components
    sessionStorage.setItem('pwa-install-available', 'true')

    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('pwa-install-available', { detail: deferredPrompt }))
  })

  // Handle successful PWA installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed')
    deferredPrompt = null
    sessionStorage.removeItem('pwa-install-available')
    window.dispatchEvent(new CustomEvent('pwa-installed'))
  })
})

// Type definition for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
