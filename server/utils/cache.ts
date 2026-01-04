// Simple in-memory cache for API responses
// Useful for frequently accessed data that doesn't change often

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>()

  set<T>(key: string, data: T, ttl: number = 60000): void {
    // Default TTL: 60 seconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  // Clear cache entries that match a prefix pattern
  clearByPrefix(prefix: string): void {
    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key))
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const cache = new SimpleCache()

// Guard to ensure cleanup interval is only created once
let cleanupInterval: ReturnType<typeof setInterval> | null = null

// Clean up expired entries every 5 minutes
// Only create interval at runtime, not during build
if (
  typeof setInterval !== 'undefined' &&
  !cleanupInterval &&
  typeof process !== 'undefined' &&
  process.env.NITRO_PRESET !== undefined // Only at runtime, not during build
) {
  cleanupInterval = setInterval(
    () => {
      cache.cleanup()
    },
    5 * 60 * 1000,
  ) // Every 5 minutes

  // Unref the interval so it doesn't prevent Node.js from exiting during build
  // This is important for build processes that should exit after completion
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref()
  }
}

// Clear Nuxt's internal cache (for admin endpoint)
export async function clearNuxtCache(): Promise<{ success: boolean; message: string }> {
  try {
    // Clear our custom cache
    cache.clear()

    // Clear Nuxt's internal cache if available
    if (typeof useNitroApp !== 'undefined') {
      const nitroApp = useNitroApp()
      if (nitroApp?.storage?.clear) {
        await nitroApp.storage.clear()
      }
    }

    return {
      success: true,
      message: 'Cache cleared successfully',
    }
  } catch (error) {
    console.error('Failed to clear cache:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear cache',
    }
  }
}
