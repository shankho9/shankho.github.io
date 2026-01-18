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
 * Get enabled OAuth providers based on runtime config
 */
export function getEnabledProviders(): OAuthProvider[] {
  const config = useRuntimeConfig()
  const enabled: OAuthProvider[] = []

  // Check each provider's configuration
  // Trim values to handle any accidental whitespace
  const googleId = config.public.googleClientId?.trim()
  let githubId = config.public.githubClientId?.trim()

  // Fallback: If runtime config doesn't have it but process.env does, use process.env
  // This handles cases where the server hasn't fully loaded the config yet
  // NOTE: This only works on server-side, not client-side
  if (!githubId && typeof process !== 'undefined' && process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID) {
    githubId = process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID.trim()
  }

  if (googleId) {
    enabled.push('google')
  }
  if (githubId) {
    enabled.push('github')
  }

  return enabled
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
  return oauthProviders[provider]
}
