// composables/useAdminAuth.ts
import { ref, computed } from 'vue'

// Shared state - all instances of useAdminAuth will use the same state
const sharedIsAuthenticated = ref<boolean | null>(null) // null = not checked yet
const sharedIsChecking = ref(false)
const sharedLastCheck = ref<number>(0)
const sharedTokenExpiresAt = ref<number | null>(null) // Actual token expiry timestamp
const sharedCheckPromise = ref<Promise<boolean> | null>(null)
const CHECK_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes - cache auth state for 5 minutes
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours - actual token expiry duration
const REQUEST_TIMEOUT = 10000 // 10 seconds timeout
const MAX_RETRIES = 2 // Maximum retry attempts

/**
 * Wait for a promise with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs),
    ),
  ])
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay = 500,
): Promise<T> {
  let lastError: Error | unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export const useAdminAuth = () => {
  const isAuthenticated = computed(() => sharedIsAuthenticated.value === true)
  const isChecking = computed(() => sharedIsChecking.value)
  const needsCheck = computed(() => {
    // Need to check if:
    // 1. Never checked before (null)
    // 2. Last check was more than 5 minutes ago
    return (
      sharedIsAuthenticated.value === null ||
      Date.now() - sharedLastCheck.value > CHECK_CACHE_DURATION
    )
  })

  const checkAuth = async (force = false): Promise<boolean> => {
    // Skip if cached and not forcing
    if (!force && !needsCheck.value && sharedIsAuthenticated.value !== null) {
      return sharedIsAuthenticated.value === true
    }

    // If already checking, return the existing promise
    if (sharedIsChecking.value && sharedCheckPromise.value) {
      return sharedCheckPromise.value
    }

    // Create new check promise
    sharedIsChecking.value = true
    sharedCheckPromise.value = (async () => {
      try {
        // Use retry logic with timeout for better reliability
        // Each retry attempt gets its own timeout window
        const response = await retryWithBackoff(() => {
          // Create a new abort controller and timeout for each retry attempt
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT)

          return withTimeout(
            $fetch<{ authenticated: boolean; tokenExpiresAt?: number | null }>('/api/admin/auth', {
              signal: abortController.signal,
            }).finally(() => clearTimeout(timeoutId)),
            REQUEST_TIMEOUT,
          )
        }, MAX_RETRIES)

        sharedIsAuthenticated.value = response.authenticated
        sharedLastCheck.value = Date.now()
        // Store actual token expiry timestamp if provided
        if (response.tokenExpiresAt) {
          sharedTokenExpiresAt.value = response.tokenExpiresAt
        } else if (response.authenticated && sharedTokenExpiresAt.value === null) {
          // If authenticated but no expiry provided, estimate based on current time + 24 hours
          // This handles cases where the API doesn't return expiry (backward compatibility)
          sharedTokenExpiresAt.value = Date.now() + TOKEN_EXPIRY_MS
        } else if (!response.authenticated) {
          // Clear token expiry if not authenticated
          sharedTokenExpiresAt.value = null
        }
        return response.authenticated
      } catch (error) {
        // Handle different error types
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.message.includes('timeout')) {
            console.warn('[AdminAuth] Request timeout - using cached state if available')
            // If we have a cached state, use it; otherwise assume not authenticated
            if (sharedIsAuthenticated.value !== null) {
              return sharedIsAuthenticated.value === true
            }
          } else if (error.message.includes('fetch')) {
            console.warn('[AdminAuth] Network error - using cached state if available')
            // Network error - use cached state if available
            if (sharedIsAuthenticated.value !== null) {
              return sharedIsAuthenticated.value === true
            }
          }
        }

        // Log error for debugging but don't expose details to user
        console.warn('[AdminAuth] Auth check failed:', error)
        sharedIsAuthenticated.value = false
        sharedLastCheck.value = Date.now()
        return false
      } finally {
        sharedIsChecking.value = false
        sharedCheckPromise.value = null
      }
    })()

    return sharedCheckPromise.value
  }

  const setAuthenticated = (value: boolean) => {
    sharedIsAuthenticated.value = value
    sharedLastCheck.value = Date.now()
    // When setting authenticated, also set token expiry if not already set
    if (value && sharedTokenExpiresAt.value === null) {
      // Estimate token expiry as current time + 24 hours
      sharedTokenExpiresAt.value = Date.now() + TOKEN_EXPIRY_MS
    } else if (!value) {
      sharedTokenExpiresAt.value = null
    }
  }

  const clearAuth = () => {
    sharedIsAuthenticated.value = false
    sharedLastCheck.value = 0
    sharedTokenExpiresAt.value = null
  }

  const setTokenExpiry = (expiresAt: number) => {
    sharedTokenExpiresAt.value = expiresAt
    // Also update last check time to reflect the refresh
    sharedLastCheck.value = Date.now()
  }

  const getTimeUntilExpiry = computed(() => {
    // Use actual token expiry if available, otherwise fall back to cache duration
    if (sharedTokenExpiresAt.value !== null) {
      const now = Date.now()
      const remaining = sharedTokenExpiresAt.value - now
      return Math.max(0, remaining)
    }
    // Fallback to cache duration if token expiry not available
    if (sharedLastCheck.value === 0) return 0
    const elapsed = Date.now() - sharedLastCheck.value
    const remaining = CHECK_CACHE_DURATION - elapsed
    return Math.max(0, remaining)
  })

  const isExpiringSoon = computed(() => {
    const remaining = getTimeUntilExpiry.value
    // Warn when less than 5 minutes remaining (for actual token expiry)
    // This gives users time to refresh before the token actually expires
    return remaining > 0 && remaining < 5 * 60 * 1000
  })

  return {
    isAuthenticated,
    isChecking,
    needsCheck,
    checkAuth,
    setAuthenticated,
    clearAuth,
    setTokenExpiry,
    getTimeUntilExpiry,
    isExpiringSoon,
  }
}
