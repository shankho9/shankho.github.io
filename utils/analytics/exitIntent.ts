/**
 * Exit intent detection utility
 * Detects when user is about to leave the page
 */

/**
 * Track exit intent (mouse leaving viewport from top)
 */
export function trackExitIntent(
  onExitIntent: () => void,
  options: { threshold?: number; delay?: number } = {},
): () => void {
  if (import.meta.server) return () => {}

  const { threshold = 10, delay = 0 } = options
  let exitIntentTriggered = false

  const handleMouseLeave = (e: MouseEvent) => {
    // Only trigger if mouse is leaving from the top of the viewport
    if (!exitIntentTriggered && e.clientY <= threshold) {
      exitIntentTriggered = true

      if (delay > 0) {
        setTimeout(() => {
          onExitIntent()
        }, delay)
      } else {
        onExitIntent()
      }
    }
  }

  // Also detect when user tries to close tab/window
  const handleBeforeUnload = () => {
    if (!exitIntentTriggered) {
      exitIntentTriggered = true
      onExitIntent()
    }
  }

  document.addEventListener('mouseleave', handleMouseLeave)
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Return cleanup function
  return () => {
    document.removeEventListener('mouseleave', handleMouseLeave)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}

/**
 * Track mobile exit intent (swipe up gesture)
 */
export function trackMobileExitIntent(
  onExitIntent: () => void,
  options: { threshold?: number } = {},
): () => void {
  if (import.meta.server) return () => {}

  const { threshold = 50 } = options
  let touchStartY = 0
  let exitIntentTriggered = false

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (exitIntentTriggered) return

    const touchEndY = e.touches[0].clientY
    const deltaY = touchStartY - touchEndY

    // Swipe up detected (negative delta means upward movement)
    if (deltaY > threshold && touchStartY < 100) {
      exitIntentTriggered = true
      onExitIntent()
    }
  }

  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: true })

  // Return cleanup function
  return () => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
  }
}
