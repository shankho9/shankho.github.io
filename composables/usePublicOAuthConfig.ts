export interface PublicOAuthConfig {
  googleClientId: string
  githubClientId: string
}

let resolvePromise: Promise<PublicOAuthConfig> | null = null

function getConfigState() {
  return useState<PublicOAuthConfig | null>('public-oauth-config', () => null)
}

function readFromRuntimeConfig(): PublicOAuthConfig {
  const runtime = useRuntimeConfig().public
  return {
    googleClientId: String(runtime.googleClientId || '').trim(),
    githubClientId: String(runtime.githubClientId || '').trim(),
  }
}

/** Resolve OAuth client IDs from build-time config or /api/config/public at runtime. */
export async function resolvePublicOAuthConfig(): Promise<PublicOAuthConfig> {
  const configState = getConfigState()

  if (configState.value) {
    return configState.value
  }

  if (resolvePromise) {
    return resolvePromise
  }

  resolvePromise = (async () => {
    const fromRuntime = readFromRuntimeConfig()

    if (import.meta.server) {
      configState.value = fromRuntime
      return fromRuntime
    }

    if (fromRuntime.googleClientId && fromRuntime.githubClientId) {
      configState.value = fromRuntime
      return fromRuntime
    }

    try {
      const fetched = await $fetch<PublicOAuthConfig>('/api/config/public')
      configState.value = {
        googleClientId: fromRuntime.googleClientId || fetched.googleClientId?.trim() || '',
        githubClientId: fromRuntime.githubClientId || fetched.githubClientId?.trim() || '',
      }
    } catch (error) {
      console.warn('[OAuth] Failed to load public config from API:', error)
      configState.value = fromRuntime
    }

    return configState.value
  })()

  try {
    return await resolvePromise
  } finally {
    resolvePromise = null
  }
}

export function usePublicOAuthConfig() {
  return {
    config: getConfigState(),
    resolvePublicOAuthConfig,
  }
}
