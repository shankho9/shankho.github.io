/** Read a user-facing message from an API response or $fetch error. */
export function readApiErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value
  return fallback
}

/** True when the API body indicates success (object or bare `true`). */
export function isApiSuccessResponse(
  response: unknown,
): response is { success: true; message?: string } {
  if (response === true) return true
  return (
    typeof response === 'object' &&
    response !== null &&
    (response as { success?: unknown }).success === true
  )
}

/** Extract a message from a failed $fetch call. */
export function readFetchErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data: unknown }).data
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      if (typeof record.error === 'string' && record.error.trim()) return record.error
      if (typeof record.message === 'string' && record.message.trim()) return record.message
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
