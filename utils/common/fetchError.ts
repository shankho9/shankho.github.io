/** Read HTTP status from a failed $fetch/ofetch call, if present. */
export function getFetchErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined

  const err = error as {
    statusCode?: number
    response?: { status?: number }
  }

  if (typeof err.statusCode === 'number') return err.statusCode
  if (typeof err.response?.status === 'number') return err.response.status
  return undefined
}

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
