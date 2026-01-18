import type { OAuthProvider } from '~/types/oauth'
import { useAuth } from './useAuth'

/**
 * Modular OAuth composable
 * Handles initialization and login for all OAuth providers
 */
export const useOAuth = () => {
  const { loginWithGoogle, loginWithGitHub } = useAuth()

  /**
   * Initialize OAuth provider scripts
   */
  const initializeProvider = async (provider: OAuthProvider): Promise<void> => {
    switch (provider) {
      case 'google':
        return initializeGoogle()
      case 'github':
        return initializeGitHub()
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }

  /**
   * Handle OAuth login for any provider
   */
  const handleProviderLogin = async (
    provider: OAuthProvider,
    credential?: { token?: string; code?: string },
  ) => {
    switch (provider) {
      case 'google':
        if (!credential?.token) {
          throw new Error('Google token is required')
        }
        return loginWithGoogle(credential.token)
      case 'github':
        if (!credential?.code) {
          throw new Error('GitHub authorization code is required')
        }
        return loginWithGitHub(credential.code)
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }

  /**
   * Initialize Google Sign-In
   */
  const initializeGoogle = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'))
        return
      }

      if (window.google?.accounts?.id) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.disableAutoSelect()
          } catch (error) {
            console.warn('[OAuth] Error disabling Google One Tap:', error)
          }
          resolve()
        } else {
          reject(new Error('Google Identity Services failed to load'))
        }
      }
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services script'))
      }
      document.head.appendChild(script)
    })
  }

  /**
   * Initialize GitHub Sign-In
   */
  const initializeGitHub = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'))
        return
      }

      const config = useRuntimeConfig()
      if (!config.public.githubClientId) {
        reject(new Error('GitHub Client ID not configured'))
        return
      }

      // GitHub OAuth uses redirect flow, no script needed
      resolve()
    })
  }

  /**
   * Handle GitHub Sign-In
   */
  const handleGitHubSignIn = async (): Promise<{
    success: boolean
    user?: unknown
    error?: string
  }> => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window is not available' }
    }

    const config = useRuntimeConfig()
    const clientId = config.public.githubClientId

    if (!clientId) {
      return { success: false, error: 'GitHub Client ID not configured' }
    }

    // GitHub OAuth uses redirect flow
    const redirectUri = `${window.location.origin}/auth/github/callback`
    const state = Math.random().toString(36).substring(7)
    sessionStorage.setItem('github_oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email',
      state,
    })

    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`
    return { success: false, error: 'Redirecting...' }
  }

  return {
    initializeProvider,
    handleProviderLogin,
    handleGitHubSignIn,
  }
}
