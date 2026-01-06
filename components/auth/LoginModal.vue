<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      @click.self="close"
    >
      <div
        class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Background overlay -->
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          @click="close"
        ></div>

        <!-- Center modal -->
        <span class="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true"
          >&#8203;</span
        >

        <!-- Modal panel -->
        <div
          class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full"
        >
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3
                  id="modal-title"
                  class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4"
                >
                  Login
                </h3>

                <!-- Error Message -->
                <div v-if="errorMessage" class="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <div class="flex">
                    <Icon name="mdi:alert-circle" class="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div class="ml-3">
                      <p class="text-sm font-medium text-red-800 dark:text-red-200">
                        {{ errorMessage }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="space-y-3">
                  <!-- Google Sign-In Button Container -->
                  <div id="google-signin-button-fallback"></div>

                  <!-- Divider -->
                  <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                      <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                      <span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        Or
                      </span>
                    </div>
                  </div>

                  <!-- Email Login Button -->
                  <NuxtLink
                    to="/auth/login"
                    class="w-full inline-flex justify-center items-center gap-3 px-4 py-2.5 border border-transparent rounded-md shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    @click="close"
                  >
                    <Icon name="mdi:email" size="20" />
                    <span>Login with Email</span>
                  </NuxtLink>

                  <!-- Forgot Password Link -->
                  <div class="text-center">
                    <NuxtLink
                      to="/auth/forgot-password"
                      class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                      @click="close"
                    >
                      Forgot password?
                    </NuxtLink>
                  </div>

                  <!-- Register Link -->
                  <p class="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Don't have an account?
                    <NuxtLink
                      to="/auth/register"
                      class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                      @click="close"
                    >
                      Sign up
                    </NuxtLink>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { initializeGoogleSignIn, handleGoogleCredential } = useAuth()
const isLoading = ref(false)
const errorMessage = ref('')
const router = useRouter()

const close = () => {
  errorMessage.value = ''
  emit('close')
}

// Initialize Google Sign-In when modal opens
const initializeGoogleSignInButton = async () => {
  if (typeof window === 'undefined') return

  try {
    // Initialize Google Sign-In script
    initializeGoogleSignIn()

    // Wait for Google to load
    await new Promise<void>((resolve) => {
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGoogle)
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(checkGoogle)
        resolve()
      }, 5000)
    })

    if (!window.google || !window.google.accounts) {
      throw new Error('Google Identity Services failed to load')
    }

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      throw new Error('Google Client ID not configured')
    }

    // Initialize Google Sign-In with comprehensive error handling
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        errorMessage.value = ''
        isLoading.value = true
        try {
          console.log('[LoginModal] Google credential received, processing...')
          const result = await handleGoogleCredential(response)
          if (result.success) {
            console.log('[LoginModal] Google login successful')
            close()
            // Redirect to intended page or home
            const redirect = router.currentRoute.value.query.redirect as string
            await router.push(redirect || '/')
          } else {
            errorMessage.value =
              result.error || 'Google login failed. Please try again or use email login.'
            console.error('[LoginModal] Google login failed:', result.error)
          }
        } catch (error: unknown) {
          const errorMsg =
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred. Please try again.'
          errorMessage.value = errorMsg
          console.error('[LoginModal] Google login error:', error)
        } finally {
          isLoading.value = false
        }
      },
      error_callback: (error: { type: string; message?: string }) => {
        console.error('[LoginModal] Google Identity Services error:', error)
        let userMessage = 'Google sign-in encountered an error.'

        // Provide more specific error messages based on error type
        if (error.type === 'popup_closed_by_user') {
          userMessage = 'Sign-in popup was closed. Please try again.'
        } else if (error.type === 'popup_blocked') {
          userMessage = 'Popup was blocked by your browser. Please allow popups and try again.'
        } else if (error.type === 'access_denied') {
          userMessage = 'Access was denied. Please try again or use email login.'
        } else if (error.message) {
          userMessage = error.message
        } else {
          userMessage =
            'Google sign-in encountered an error. Please check your browser settings or try email login.'
        }

        errorMessage.value = userMessage
        isLoading.value = false
      },
    })

    // Disable One Tap prompt to avoid showing popup in top right
    window.google.accounts.id.disableAutoSelect()

    // Render Google Sign-In button
    await nextTick()
    const buttonContainer = document.getElementById('google-signin-button-fallback')
    if (buttonContainer) {
      try {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: '100%',
        })
      } catch (renderError) {
        console.error('[LoginModal] Error rendering Google button:', renderError)
        errorMessage.value = 'Failed to load Google sign-in. Please try refreshing the page.'
      }
    }
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : 'Failed to initialize Google login. Please check your configuration.'
    errorMessage.value = errorMsg
    console.error('[LoginModal] Failed to initialize Google login:', error)
  }
}

// Close on escape key
let escapeHandler: ((e: KeyboardEvent) => void) | null = null

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      // Initialize Google Sign-In when modal opens
      await initializeGoogleSignInButton()

      escapeHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          close()
        }
      }
      document.addEventListener('keydown', escapeHandler)
    } else if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler)
      escapeHandler = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
  }
})
</script>
