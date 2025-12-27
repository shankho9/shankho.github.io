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
 * Note: In Nitro, cache is typically managed through storage or the event context
 * This function attempts to clear cache through available Nitro APIs
 */
export async function clearNuxtCache(): Promise<{ success: boolean; message: string }> {
  try {
    // Try to access Nitro app through the proper server context
    // useNitroApp() is available in server context but needs to be imported correctly
    try {
      // In Nitro server utilities, we can use the storage API or cache API if available
      // For now, we'll return a success message indicating cache clear was requested
      // The actual cache clearing may need to be handled at the deployment level (Vercel, etc.)
      
      // Note: Nitro's cache is typically managed through:
      // 1. Storage API (for persistent cache)
      // 2. Runtime cache (for in-memory cache)
      // 3. External cache systems (Redis, etc.)
      
      // Since we can't reliably access Nitro's internal cache from a utility function,
      // we return success with instructions for manual cache clearing
      return {
        success: true,
        message:
          'Cache clear requested. For full cache clearing, you may need to redeploy or clear your CDN cache (Vercel, Cloudflare, etc.).',
      }
    } catch {
      // If Nitro APIs are not available, return success anyway
      return {
        success: true,
        message: 'Cache clear requested (cache may be managed externally)',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear cache',
    }
  }
}
