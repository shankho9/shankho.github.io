/**
 * Scroll depth tracking utility
 * Tracks how far users scroll on a page
 */

export interface ScrollDepthData {
  depth: number // Percentage (0-100)
  timestamp: number
}

const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 90, 100]
const trackedMilestones = new Set<number>()

/**
 * Track scroll depth on current page
 */
export function trackScrollDepth(
  onMilestone: (depth: number) => void,
  element?: HTMLElement | null,
): () => void {
  if (import.meta.server) return () => {}

  const targetElement = element || document.documentElement
  const maxScroll = targetElement.scrollHeight - targetElement.clientHeight

  const handleScroll = () => {
    const scrollTop = targetElement.scrollTop
    const scrollPercentage = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0

    // Check each milestone
    SCROLL_DEPTH_MILESTONES.forEach((milestone) => {
      if (scrollPercentage >= milestone && !trackedMilestones.has(milestone)) {
        trackedMilestones.add(milestone)
        onMilestone(milestone)
      }
    })
  }

  // Throttle scroll events
  let ticking = false
  const throttledHandleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll()
        ticking = false
      })
      ticking = true
    }
  }

  targetElement.addEventListener('scroll', throttledHandleScroll, { passive: true })

  // Return cleanup function
  return () => {
    targetElement.removeEventListener('scroll', throttledHandleScroll)
    trackedMilestones.clear()
  }
}

/**
 * Reset scroll tracking (useful when navigating to new page)
 */
export function resetScrollTracking(): void {
  trackedMilestones.clear()
}
