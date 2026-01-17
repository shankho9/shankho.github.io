/**
 * Composable for analytics tracking
 * Provides scroll depth, reading time, and exit intent tracking
 */
import { trackScrollDepth, resetScrollTracking } from '~/utils/analytics/scrollDepth'
import { startReadingTimeTracking } from '~/utils/analytics/readingTime'
import { trackExitIntent, trackMobileExitIntent } from '~/utils/analytics/exitIntent'

export const useAnalytics = () => {
  const scrollDepthCleanup = ref<(() => void) | null>(null)
  const readingTimeCleanup = ref<(() => void) | null>(null)
  const exitIntentCleanup = ref<(() => void) | null>(null)

  /**
   * Track scroll depth and send to analytics API
   */
  const trackScroll = (pagePath: string) => {
    if (import.meta.server) return

    // Clean up previous tracking
    if (scrollDepthCleanup.value) {
      scrollDepthCleanup.value()
    }

    scrollDepthCleanup.value = trackScrollDepth((depth) => {
      // Send scroll depth to analytics API
      $fetch('/api/analytics/scroll-depth', {
        method: 'POST',
        body: {
          page: pagePath,
          depth,
          timestamp: Date.now(),
        },
      }).catch((error) => {
        console.warn('[Analytics] Failed to track scroll depth:', error)
      })
    })
  }

  /**
   * Track reading time for blog posts
   */
  const trackReading = (pagePath: string, wordCount: number, estimatedReadingTime: number) => {
    if (import.meta.server) return

    // Clean up previous tracking
    if (readingTimeCleanup.value) {
      readingTimeCleanup.value()
    }

    readingTimeCleanup.value = startReadingTimeTracking(
      (data) => {
        // Send reading time to analytics API
        $fetch('/api/analytics/reading-time', {
          method: 'POST',
          body: {
            page: pagePath,
            ...data,
          },
        }).catch((error) => {
          console.warn('[Analytics] Failed to track reading time:', error)
        })
      },
      wordCount,
      estimatedReadingTime,
    )
  }

  /**
   * Track exit intent
   */
  const trackExit = (pagePath: string, onExit?: () => void) => {
    if (import.meta.server) return

    // Clean up previous tracking
    if (exitIntentCleanup.value) {
      exitIntentCleanup.value()
    }

    const handleExitIntent = () => {
      // Send exit intent to analytics API
      $fetch('/api/analytics/exit-intent', {
        method: 'POST',
        body: {
          page: pagePath,
          timestamp: Date.now(),
        },
      }).catch((error) => {
        console.warn('[Analytics] Failed to track exit intent:', error)
      })

      // Call custom handler if provided
      if (onExit) {
        onExit()
      }
    }

    // Track both desktop and mobile exit intent
    const desktopCleanup = trackExitIntent(handleExitIntent)
    const mobileCleanup = trackMobileExitIntent(handleExitIntent)

    exitIntentCleanup.value = () => {
      desktopCleanup()
      mobileCleanup()
    }
  }

  /**
   * Stop all tracking
   */
  const stopTracking = () => {
    if (scrollDepthCleanup.value) {
      scrollDepthCleanup.value()
      scrollDepthCleanup.value = null
    }
    if (readingTimeCleanup.value) {
      readingTimeCleanup.value()
      readingTimeCleanup.value = null
    }
    if (exitIntentCleanup.value) {
      exitIntentCleanup.value()
      exitIntentCleanup.value = null
    }
    resetScrollTracking()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    trackScroll,
    trackReading,
    trackExit,
    stopTracking,
  }
}
