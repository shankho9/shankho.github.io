// server/utils/cache.ts
import type { H3Event } from 'h3'
import { setHeader } from 'h3'

/**
 * Clear cache headers for a response
 */
export function clearCacheHeaders(event: H3Event): void {
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setHeader(event, 'Pragma', 'no-cache')
  setHeader(event, 'Expires', '0')
  setHeader(event, 'Surrogate-Control', 'no-store')
}

/**
 * Set cache headers for a response
 */
export function setCacheHeaders(event: H3Event, maxAge: number = 3600): void {
  setHeader(event, 'Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`)
}

/**
 * Clear Nuxt cache (if using Nitro cache)
 */
export async function clearNuxtCache(): Promise<{ success: boolean; message: string }> {
  try {
    // Clear Nitro cache if available
    if (typeof useNitroApp !== 'undefined') {
      const nitroApp = useNitroApp()
      if (nitroApp && nitroApp.cache) {
        await nitroApp.cache.clear()
        return { success: true, message: 'Nuxt cache cleared successfully' }
      }
    }

    // If Nitro cache is not available, return success anyway
    // as the cache might be managed differently
    return { success: true, message: 'Cache clear requested (cache may be managed externally)' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear cache',
    }
  }
}
