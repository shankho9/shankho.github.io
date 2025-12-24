import { ref, computed } from 'vue'

interface GoogleUser {
  email: string
  name: string
  picture: string
  sub: string
}

export const useGoogleAuth = () => {
  const user = ref<GoogleUser | null>(null)
  const isLoading = ref(false)
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
