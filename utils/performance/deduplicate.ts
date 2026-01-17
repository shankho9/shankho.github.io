/**
 * Request deduplication utilities
 * Prevents duplicate API calls when multiple components request the same data
 */

const pendingRequests = new Map<string, Promise<unknown>>()

/**
 * Deduplicate requests - if same request is in flight, return the existing promise
 */
export async function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // If request is already pending, return the existing promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>
  }

  // Create new request
  const request = requestFn().finally(() => {
    // Remove from pending when done
    pendingRequests.delete(key)
  })

  // Store pending request
  pendingRequests.set(key, request)

  return request
}

/**
 * Clear all pending requests (useful for testing or cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear()
}

/**
 * Get count of pending requests
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size
}
