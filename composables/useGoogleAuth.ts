import { ref, computed } from 'vue'

interface GoogleUser {
  email: string
  name: string
  picture: string
  sub: string
}

// Shared state - all instances of useGoogleAuth will use the same state
const sharedUser = ref<GoogleUser | null>(null)
const sharedIsLoading = ref(false)

// Event handler functions stored for potential cleanup
let storageHandler: ((e: StorageEvent) => void) | null = null
let signOutHandler: (() => void) | null = null
let signInHandler: ((e: Event) => void) | null = null

// Register event listeners once at module level to avoid duplicates and closure issues
if (typeof window !== 'undefined') {
  // Listen for localStorage changes (cross-tab synchronization)
  storageHandler = (e: StorageEvent) => {
    if (e.key === 'google_user') {
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

  // Listen for custom sign-out events (same-tab synchronization)
  signOutHandler = () => {
    sharedUser.value = null
  }
  window.addEventListener('auth:signout', signOutHandler)

  // Listen for custom sign-in events (same-tab synchronization)
  signInHandler = (e: Event) => {
    const customEvent = e as CustomEvent<GoogleUser>
    if (customEvent.detail) {
      sharedUser.value = customEvent.detail
    }
  }
  window.addEventListener('auth:signin', signInHandler)
}

export const useGoogleAuth = () => {
  const user = sharedUser
  const isLoading = sharedIsLoading
  const isAuthenticated = computed(() => !!user.value)

  const initializeGoogleSignIn = () => {
    if (typeof window === 'undefined') return

    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }

  const handleCredentialResponse = async (response: { credential: string }) => {
    isLoading.value = true
    try {
      // Verify token on server
      const result = await $fetch<{ user: GoogleUser }>('/api/auth/google', {
        method: 'POST',
        body: { token: response.credential },
      })

      user.value = result.user

      // Store in localStorage
      localStorage.setItem('google_user', JSON.stringify(result.user))

      // Track login event for analytics
      if (typeof window !== 'undefined') {
        const { trackLogin } = await import('~/utils/trackLogin')
        await trackLogin(result.user.email, result.user.name, window.location.pathname)
      }

      // Dispatch custom event to notify all components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const signIn = () => {
    if (typeof window === 'undefined' || !window.google) {
      console.error('Google Identity Services not loaded')
      return
    }

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('Google Client ID not configured')
      return
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
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

  const signOut = () => {
    user.value = null
    localStorage.removeItem('google_user')

    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.disableAutoSelect()
    }

    // Clear any rendered sign-in buttons and trigger re-render
    if (typeof window !== 'undefined') {
      // Dispatch a custom event to notify all components
      window.dispatchEvent(new CustomEvent('auth:signout'))
    }
  }

  const loadStoredUser = () => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem('google_user')
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse stored user', e)
      }
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    initializeGoogleSignIn,
    signIn,
    signOut,
    loadStoredUser,
  }
}