/** Extract a user-facing message from a Nuxt/ofetch error response. */
export function getFetchErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message || fallback : fallback
  }

  const err = error as {
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string }
  }

  return (
    err.data?.statusMessage ||
    err.data?.message ||
    err.statusMessage ||
    (typeof err.message === 'string' && err.message !== 'true' ? err.message : '') ||
    fallback
  )
}
