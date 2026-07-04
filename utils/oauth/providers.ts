import type { OAuthProvider, OAuthProviderConfig } from '~/types/oauth'

/**
 * OAuth Provider Configuration
 * Centralized configuration for all OAuth providers
 */
export const oauthProviders: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    name: 'Google',
    icon: 'mdi:google',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700',
    hoverColor: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    enabled: true,
  },
  github: {
    name: 'GitHub',
    icon: 'mdi:github',
    color: 'text-white',
    bgColor: 'bg-[#24292e] hover:bg-[#1a1e22]',
    hoverColor: 'hover:bg-[#1a1e22]',
    enabled: true,
  },
}

/**
 * Get enabled OAuth providers from resolved client IDs.
 */
export function getEnabledProvidersFromConfig(config: {
  googleClientId?: string
  githubClientId?: string
}): OAuthProvider[] {
  const enabled: OAuthProvider[] = []
  const googleId = config.googleClientId?.trim()
  const githubId = config.githubClientId?.trim()

  if (googleId) {
    enabled.push('google')
  }
  if (githubId) {
    enabled.push('github')
  }

  return enabled
}

/**
 * Get enabled OAuth providers based on runtime config (sync; may be empty on client until resolved).
 */
export function getEnabledProviders(): OAuthProvider[] {
  const config = useRuntimeConfig()
  let githubId = config.public.githubClientId?.trim()

  // Server-only fallback when runtime config is not yet hydrated
  if (!githubId && typeof process !== 'undefined' && process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID) {
    githubId = process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID.trim()
  }

  return getEnabledProvidersFromConfig({
    googleClientId: config.public.googleClientId,
    githubClientId: githubId,
  })
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
  return oauthProviders[provider]
}
