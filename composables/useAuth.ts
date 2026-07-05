// composables/useAuth.ts
import { ref, computed } from 'vue'

interface User {
  id: number
  email: string
  name: string | null
  picture: string | null
  auth_provider: 'email' | 'google' | 'apple' | 'outlook' | 'github'
  mfa_enabled: boolean
  role: 'visitor' | 'admin'
}

// Shared state
const sharedUser = ref<User | null>(null)
const sharedIsLoading = ref(false)
const sharedIsChecking = ref(false)
const sharedLastCheck = ref<number>(0)
const CHECK_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Event handlers for cross-tab synchronization
let storageHandler: ((e: StorageEvent) => void) | null = null
let signOutHandler: (() => void) | null = null
let signInHandler: ((e: Event) => void) | null = null

// Initialize event listeners once
if (typeof window !== 'undefined' && !storageHandler) {
  // Load existing user from localStorage if available
  const hasInitialized = sessionStorage.getItem('auth_initialized')
  if (!hasInitialized) {
    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        sharedUser.value = JSON.parse(stored)
      } catch (e) {
        console.error('[Auth] Failed to parse stored user:', e)
        sharedUser.value = null
        localStorage.removeItem('auth_user')
      }
    }
    sessionStorage.setItem('auth_initialized', 'true')
  }

  // Listen for localStorage changes (cross-tab synchronization)
  storageHandler = (e: StorageEvent) => {
    if (e.key === 'auth_user') {
      if (e.newValue) {
        try {
          sharedUser.value = JSON.parse(e.newValue)
        } catch (err) {
          console.error('[Auth] Failed to parse user from storage event:', err)
          sharedUser.value = null
        }
      } else {
        sharedUser.value = null
      }
    }
  }
  window.addEventListener('storage', storageHandler)

  // Listen for custom sign-out events
  signOutHandler = () => {
    sharedUser.value = null
  }
  window.addEventListener('auth:signout', signOutHandler)

  // Listen for custom sign-in events
  signInHandler = (e: Event) => {
    const customEvent = e as CustomEvent<User>
    if (customEvent.detail) {
      sharedUser.value = customEvent.detail
    }
  }
  window.addEventListener('auth:signin', signInHandler)
}

export const useAuth = () => {
  const user = sharedUser
  const isLoading = sharedIsLoading
  const isChecking = sharedIsChecking
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  /**
   * Check authentication status
   */
  const checkAuth = async (force = false): Promise<boolean> => {
    // Use cache if available and not forcing
    const now = Date.now()
    if (!force && now - sharedLastCheck.value < CHECK_CACHE_DURATION && user.value) {
      return true
    }

    // If already checking, wait for it (with timeout to prevent infinite waiting)
    if (sharedIsChecking.value) {
      return new Promise((resolve) => {
        let attempts = 0
        const maxAttempts = 50 // 50 * 100ms = 5 seconds max wait
        const checkInterval = setInterval(() => {
          attempts++
          if (!sharedIsChecking.value || attempts >= maxAttempts) {
            clearInterval(checkInterval)
            resolve(!!user.value)
          }
        }, 100)
      })
    }

    sharedIsChecking.value = true
    try {
      // Add timeout to prevent hanging (5 seconds)
      const response = await $fetch<{ authenticated: boolean; user: User | null }>('/api/auth/me', {
        timeout: 5000, // 5 second timeout
      })
      sharedIsChecking.value = false
      sharedLastCheck.value = now

      if (response.authenticated && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        return true
      } else {
        user.value = null
        localStorage.removeItem('auth_user')
        return false
      }
    } catch (error) {
      console.warn('[Auth] Auth check failed:', error)
      sharedIsChecking.value = false
      sharedLastCheck.value = now
      // On error, keep existing state if available
      return !!user.value
    }
  }

  /**
   * Register with email and password
   */
  const register = async (email: string, password: string, name?: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; user: User; error?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: { email, password, name },
        },
      )

      if (response.success && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: response.user }))
        }
        return { success: true, user: response.user }
      } else {
        return { success: false, error: response.error || 'Registration failed' }
      }
    } catch (error: unknown) {
      console.error('[Auth] Registration error:', error)
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { error?: string })?.error
          : error instanceof Error
            ? error.message
            : 'Registration failed'
      return {
        success: false,
        error: errorMessage || 'Registration failed',
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string, mfaCode?: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<{
        success: boolean
        user: User
        error?: string
        requiresMFA?: boolean
      }>('/api/auth/login', {
        method: 'POST',
        body: { email, password, mfaCode },
      })

      if (response.success && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        sharedLastCheck.value = Date.now()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: response.user }))
        }
        return { success: true, user: response.user }
      } else {
        return {
          success: false,
          error: response.error || 'Login failed',
          requiresMFA: response.requiresMFA,
        }
      }
    } catch (error: unknown) {
      console.error('[Auth] Login error:', error)
      const errorData =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { error?: string; requiresMFA?: boolean })
          : null
      const errorMessage =
        errorData?.error || (error instanceof Error ? error.message : 'Login failed')
      return {
        success: false,
        error: errorMessage,
        requiresMFA: errorData?.requiresMFA,
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login with Google OAuth
   */
  const loginWithGoogle = async (token: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; user: User; error?: string }>(
        '/api/auth/google',
        {
          method: 'POST',
          body: { token },
        },
      )

      if (response.success && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        sharedLastCheck.value = Date.now()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: response.user }))
        }
        return { success: true, user: response.user }
      } else {
        return { success: false, error: response.error || 'Google login failed' }
      }
    } catch (error: unknown) {
      console.error('[Auth] Google login error:', error)

      // Extract error message with better type handling
      let errorMessage = 'Google login failed'

      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { error?: string | boolean; message?: string }
        // Handle both string and boolean error values
        if (typeof errorData?.error === 'string') {
          errorMessage = errorData.error
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.error === true) {
          // If error is boolean true, use a generic message
          errorMessage =
            'Google authentication failed. Please check your configuration or try again.'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Ensure we always return a string, never a boolean
      return {
        success: false,
        error: typeof errorMessage === 'string' ? errorMessage : 'Google login failed',
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login with Apple OAuth
   */
  const loginWithApple = async (token: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; user: User; error?: string }>(
        '/api/auth/apple',
        {
          method: 'POST',
          body: { token },
        },
      )

      if (response.success && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        sharedLastCheck.value = Date.now()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: response.user }))
        }
        return { success: true, user: response.user }
      } else {
        return { success: false, error: response.error || 'Apple login failed' }
      }
    } catch (error: unknown) {
      console.error('[Auth] Apple login error:', error)
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { error?: string })?.error || 'Apple login failed'
          : error instanceof Error
            ? error.message
            : 'Apple login failed'
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login with Outlook/Microsoft OAuth
   */
  const loginWithOutlook = async (code: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; user: User; error?: string }>(
        '/api/auth/outlook',
        {
          method: 'POST',
          body: { code },
        },
      )

      if (response.success && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        sharedLastCheck.value = Date.now()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: response.user }))
        }
        return { success: true, user: response.user }
      } else {
        return { success: false, error: response.error || 'Outlook login failed' }
      }
    } catch (error: unknown) {
      console.error('[Auth] Outlook login error:', error)
      const errorMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { error?: string })?.error || 'Outlook login failed'
          : error instanceof Error
            ? error.message
            : 'Outlook login failed'
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login with GitHub OAuth
   */
  const loginWithGitHub = async (code: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; user: User; error?: string }>(
        '/api/auth/github',
        {
          method: 'POST',
          body: { code },
        },
      )

      if (response.success && response.user) {
        user.value = response.user
        localStorage.setItem('auth_user', JSON.stringify(response.user))
        sharedLastCheck.value = Date.now()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signin', { detail: response.user }))
        }
        return { success: true, user: response.user }
      } else {
        return { success: false, error: response.error || 'GitHub login failed' }
      }
    } catch (error: unknown) {
      console.error('[Auth] GitHub login error:', error)
      let errorMessage = 'GitHub login failed'

      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data as { error?: string; message?: string }
        errorMessage = errorData?.error || errorData?.message || 'GitHub login failed'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Ensure error message is a proper string, not a boolean
      if (
        errorMessage === 'true' ||
        errorMessage === 'false' ||
        errorMessage === true ||
        errorMessage === false
      ) {
        errorMessage = 'GitHub login failed. Please try again.'
      }

      return { success: false, error: String(errorMessage) }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Initialize Google Sign-In
   */
  const initializeGoogleSignIn = () => {
    if (typeof window === 'undefined') return

    if (!window.google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        // Disable One Tap globally as soon as Google loads
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.disableAutoSelect()
          } catch (error) {
            console.warn('[Auth] Error disabling One Tap on script load:', error)
          }
        }
      }
      document.head.appendChild(script)
    } else if (window.google?.accounts?.id) {
      // If Google is already loaded, disable One Tap immediately
      try {
        window.google.accounts.id.disableAutoSelect()
      } catch (error) {
        console.warn('[Auth] Error disabling One Tap:', error)
      }
    }
  }

  /**
   * Handle Google credential response
   */
  const handleGoogleCredential = async (response: { credential: string }) => {
    return loginWithGoogle(response.credential)
  }

  /**
   * Sign in with Google (prompts user)
   */
  const signIn = async () => {
    if (typeof window === 'undefined' || !window.google) {
      console.error('[Auth] Google Identity Services not loaded')
      return
    }

    const oauthConfig = await resolvePublicOAuthConfig()
    const clientId = oauthConfig.googleClientId
    if (!clientId) {
      console.error('[Auth] Google Client ID not configured')
      return
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    })

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback to button click
        const buttonElement = document.getElementById('google-signin-button')
        if (buttonElement && window.google) {
          window.google.accounts.id.renderButton(buttonElement, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 250,
          })
        }
      }
    })
  }

  /**
   * Sign out - clears all authentication state and session
   */
  const signOut = async () => {
    isLoading.value = true
    try {
      // Call logout API to revoke server-side session
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (error: unknown) {
      // Even if API call fails, clear client-side state
      console.error('[Auth] Logout error:', error)
    } finally {
      // Clear all client-side authentication state
      user.value = null
      sharedUser.value = null
      localStorage.removeItem('auth_user')
      sharedLastCheck.value = 0

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_passcode_verified')

        // Clear Google OAuth initialization flag to allow re-initialization on next login
        sessionStorage.removeItem('google_oauth_initialized')

        // Dispatch custom event for cross-tab synchronization
        window.dispatchEvent(new CustomEvent('auth:signout'))

        // Clear OAuth provider states
        // Google
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.disableAutoSelect()
          } catch (e) {
            console.warn('[Auth] Failed to disable Google auto-select:', e)
          }
        }

        // Note: Apple, Outlook, and GitHub don't require explicit cleanup
        // as they use redirect-based flows or don't maintain persistent state
      }

      isLoading.value = false
    }
  }

  /**
   * Load stored user from localStorage
   */
  const loadStoredUser = () => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch (e) {
        console.error('[Auth] Failed to parse stored user:', e)
        user.value = null
        localStorage.removeItem('auth_user')
      }
    }
  }

  /**
   * Verify admin passcode (distinct from visitor/utility passcode)
   */
  const verifyAdminPasscode = async (passcode: string) => {
    try {
      const response = await $fetch<{ success: boolean; error?: string }>(
        '/api/auth/admin-passcode/verify',
        { method: 'POST', body: { passcode } },
      )
      return response
    } catch (error: unknown) {
      const data =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { error?: string })
          : null
      return {
        success: false,
        error: data?.error || (error instanceof Error ? error.message : 'Verification failed'),
      }
    }
  }

  /**
   * Check admin passcode status
   */
  const checkAdminPasscodeStatus = async () => {
    try {
      const response = await $fetch<{
        authenticated: boolean
        isSet: boolean
        needsRotation: boolean
        expiresAt: string | null
      }>('/api/auth/admin-passcode/status')
      return response
    } catch (error) {
      console.error('[Auth] Failed to check admin passcode status:', error)
      return { authenticated: false, isSet: false, needsRotation: false, expiresAt: null }
    }
  }

  return {
    user,
    isLoading,
    isChecking,
    isAuthenticated,
    isAdmin,
    checkAuth,
    register,
    login,
    loginWithGoogle,
    loginWithApple,
    loginWithOutlook,
    loginWithGitHub,
    initializeGoogleSignIn,
    handleGoogleCredential,
    signIn,
    signOut,
    loadStoredUser,
    verifyAdminPasscode,
    checkAdminPasscodeStatus,
  }
}
