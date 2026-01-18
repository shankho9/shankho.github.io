import type { OAuthProvider } from '~/types/oauth'
import { useAuth } from './useAuth'

/**
 * Modular OAuth composable
 * Handles initialization and login for all OAuth providers
 */
export const useOAuth = () => {
  const { loginWithGoogle, loginWithApple, loginWithOutlook, loginWithGitHub } = useAuth()

  /**
   * Initialize OAuth provider scripts
   */
  const initializeProvider = async (provider: OAuthProvider): Promise<void> => {
    switch (provider) {
      case 'google':
        return initializeGoogle()
      case 'apple':
        return initializeApple()
      case 'outlook':
        return initializeOutlook()
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
      case 'apple':
        if (!credential?.token) {
          throw new Error('Apple token is required')
        }
        return loginWithApple(credential.token)
      case 'outlook':
        if (!credential?.code) {
          throw new Error('Outlook authorization code is required')
        }
        return loginWithOutlook(credential.code)
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
   * Initialize Apple Sign-In
   */
  const initializeApple = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'))
        return
      }

      // Apple Sign-In uses meta tags and doesn't require a script
      // Just verify the configuration exists
      const config = useRuntimeConfig()
      if (!config.public.appleClientId) {
        reject(new Error('Apple Client ID not configured'))
        return
      }

      resolve()
    })
  }

  /**
   * Initialize Microsoft/Outlook Sign-In
   */
  const initializeOutlook = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'))
        return
      }

      if (window.microsoft?.AuthenticationContext) {
        resolve()
        return
      }

      const config = useRuntimeConfig()
      if (!config.public.outlookClientId) {
        reject(new Error('Outlook Client ID not configured'))
        return
      }

      // Microsoft MSAL.js library
      const script = document.createElement('script')
      script.src = 'https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.microsoft?.AuthenticationContext || window.msal) {
          resolve()
        } else {
          reject(new Error('Microsoft Authentication Library failed to load'))
        }
      }
      script.onerror = () => {
        reject(new Error('Failed to load Microsoft Authentication Library'))
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
   * Handle Apple Sign-In
   */
  const handleAppleSignIn = async (): Promise<{
    success: boolean
    user?: unknown
    error?: string
  }> => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window is not available' }
    }

    const config = useRuntimeConfig()
    const clientId = config.public.appleClientId
    if (!clientId) {
      return { success: false, error: 'Apple Client ID not configured' }
    }

    // Apple Sign-In uses a redirect flow
    // For now, we'll use a popup approach similar to Google
    // In production, you might want to use the redirect flow
    const redirectUri = `${window.location.origin}/auth/apple/callback`
    const state = Math.random().toString(36).substring(7)
    sessionStorage.setItem('apple_oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      scope: 'name email',
      response_mode: 'form_post',
      state,
    })

    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`

    // Open popup window
    const width = 500
    const height = 600
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    return new Promise((resolve) => {
      const popup = window.open(
        appleAuthUrl,
        'Apple Sign In',
        `width=${width},height=${height},left=${left},top=${top}`,
      )

      if (!popup) {
        resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' })
        return
      }

      // Listen for message from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return
        }

        if (event.data.type === 'apple_oauth_success') {
          window.removeEventListener('message', messageHandler)
          popup.close()
          loginWithApple(event.data.token)
            .then((result) => resolve(result))
            .catch((error) => resolve({ success: false, error: error.message }))
        } else if (event.data.type === 'apple_oauth_error') {
          window.removeEventListener('message', messageHandler)
          popup.close()
          resolve({ success: false, error: event.data.error })
        }
      }

      window.addEventListener('message', messageHandler)

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          resolve({ success: false, error: 'Sign-in was cancelled' })
        }
      }, 1000)
    })
  }

  /**
   * Handle Outlook/Microsoft Sign-In
   */
  const handleOutlookSignIn = async (): Promise<{
    success: boolean
    user?: unknown
    error?: string
  }> => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window is not available' }
    }

    const config = useRuntimeConfig()
    const clientId = config.public.outlookClientId
    if (!clientId) {
      return { success: false, error: 'Outlook Client ID not configured' }
    }

    // Microsoft OAuth uses redirect flow
    const redirectUri = `${window.location.origin}/auth/outlook/callback`
    const state = Math.random().toString(36).substring(7)
    sessionStorage.setItem('outlook_oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    })

    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
    return { success: false, error: 'Redirecting...' }
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
    handleAppleSignIn,
    handleOutlookSignIn,
    handleGitHubSignIn,
  }
}
