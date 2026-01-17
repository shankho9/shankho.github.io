/**
 * Reading time tracking utility
 * Tracks how long users spend reading content
 */

export interface ReadingTimeData {
  startTime: number
  endTime?: number
  duration: number // in seconds
  wordCount: number
  estimatedReadingTime: number // in minutes
}

let readingStartTime: number | null = null
let readingTimer: NodeJS.Timeout | null = null
let isReading = false

/**
 * Start tracking reading time
 */
export function startReadingTimeTracking(
  onComplete: (data: ReadingTimeData) => void,
  wordCount: number,
  estimatedReadingTime: number,
): () => void {
  if (import.meta.server) return () => {}

  if (isReading) {
    // Already tracking, return cleanup
    return stopReadingTimeTracking
  }

  readingStartTime = Date.now()
  isReading = true

  // Calculate minimum reading time (50% of estimated time)
  const minReadingTime = estimatedReadingTime * 60 * 0.5 * 1000 // Convert to milliseconds

  // Track when user leaves the page or becomes inactive
  const handleVisibilityChange = () => {
    if (document.hidden && readingStartTime) {
      const duration = (Date.now() - readingStartTime) / 1000 // Convert to seconds
      if (duration >= minReadingTime / 1000) {
        onComplete({
          startTime: readingStartTime,
          endTime: Date.now(),
          duration,
          wordCount,
          estimatedReadingTime,
        })
      }
      stopReadingTimeTracking()
    }
  }

  const handleBeforeUnload = () => {
    if (readingStartTime) {
      const duration = (Date.now() - readingStartTime) / 1000
      if (duration >= minReadingTime / 1000) {
        // Use sendBeacon for reliable tracking on page unload
        const data = JSON.stringify({
          startTime: readingStartTime,
          endTime: Date.now(),
          duration,
          wordCount,
          estimatedReadingTime,
        })
        navigator.sendBeacon('/api/analytics/reading-time', data)
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    stopReadingTimeTracking()
  }
}

/**
 * Stop tracking reading time
 */
export function stopReadingTimeTracking(): void {
  if (readingTimer) {
    clearTimeout(readingTimer)
    readingTimer = null
  }
  readingStartTime = null
  isReading = false
}
