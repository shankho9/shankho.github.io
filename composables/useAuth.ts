// composables/useAuth.ts
import { ref, computed } from 'vue'

interface User {
  id: number
  email: string
  name: string | null
  picture: string | null
  auth_provider: 'email' | 'google'
  mfa_enabled: boolean
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

  /**
   * Check authentication status
   */
  const checkAuth = async (force = false): Promise<boolean> => {
    // Use cache if available and not forcing
    const now = Date.now()
    if (!force && now - sharedLastCheck.value < CHECK_CACHE_DURATION && user.value) {
      return true
    }

    // If already checking, wait for it
    if (sharedIsChecking.value) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!sharedIsChecking.value) {
            clearInterval(checkInterval)
            resolve(!!user.value)
          }
        }, 100)
      })
    }

    sharedIsChecking.value = true
    try {
      const response = await $fetch<{ authenticated: boolean; user: User | null }>('/api/auth/me')
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
  const signIn = () => {
    if (typeof window === 'undefined' || !window.google) {
      console.error('[Auth] Google Identity Services not loaded')
      return
    }

    const clientId = useRuntimeConfig().public.googleClientId
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
   * Sign out
   */
  const signOut = async () => {
    isLoading.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (error: unknown) {
      console.error('[Auth] Logout error:', error)
    } finally {
      user.value = null
      localStorage.removeItem('auth_user')
      sharedLastCheck.value = 0
      if (typeof window !== 'undefined') {
        // Clear utility passcode verification flag on logout
        sessionStorage.removeItem('utility_passcode_verified')
        window.dispatchEvent(new CustomEvent('auth:signout'))
        if (window.google) {
          window.google.accounts.id.disableAutoSelect()
        }
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
   * Verify utility passcode
   */
  const verifyUtilityPasscode = async (passcode: string) => {
    try {
      const response = await $fetch<{ success: boolean; error?: string }>(
        '/api/auth/utility-passcode/verify',
        {
          method: 'POST',
          body: { passcode },
        },
      )
      return response
    } catch (error: unknown) {
      const errorData =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { error?: string })
          : null
      const errorMessage =
        errorData?.error || (error instanceof Error ? error.message : 'Verification failed')
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Check utility passcode status
   */
  const checkUtilityPasscodeStatus = async () => {
    try {
      const response = await $fetch<{
        authenticated: boolean
        isSet: boolean
        needsRotation: boolean
        expiresAt: string | null
      }>('/api/auth/utility-passcode/status')
      return response
    } catch (error) {
      console.error('[Auth] Failed to check utility passcode status:', error)
      return { authenticated: false, isSet: false, needsRotation: false, expiresAt: null }
    }
  }

  return {
    user,
    isLoading,
    isChecking,
    isAuthenticated,
    checkAuth,
    register,
    login,
    loginWithGoogle,
    initializeGoogleSignIn,
    handleGoogleCredential,
    signIn,
    signOut,
    loadStoredUser,
    verifyUtilityPasscode,
    checkUtilityPasscodeStatus,
  }
}
