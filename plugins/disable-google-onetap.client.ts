// Disable Google One Tap globally to prevent popup in top-right corner
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  // Function to disable One Tap
  const disableOneTap = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect()
      } catch {
        // Silently fail - One Tap might not be initialized yet
      }
    }
  }

  // If Google is already loaded, disable immediately
  if (window.google?.accounts?.id) {
    disableOneTap()
  }

  // Also watch for when Google loads
  const checkInterval = setInterval(() => {
    if (window.google?.accounts?.id) {
      disableOneTap()
      clearInterval(checkInterval)
    }
  }, 100)

  // Clear interval after 10 seconds (Google should load by then)
  setTimeout(() => {
    clearInterval(checkInterval)
  }, 10000)
})
