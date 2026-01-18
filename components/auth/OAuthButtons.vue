<template>
  <div class="space-y-3">
    <div
      v-for="provider in enabledProviders"
      :id="`oauth-${provider}-button`"
      :key="provider"
      :class="[
        'oauth-button',
        getProviderConfig(provider).bgColor,
        getProviderConfig(provider).hoverColor,
        fullWidth ? 'w-full' : '',
        sizeClasses,
        'flex items-center justify-center gap-3 px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors cursor-pointer',
      ]"
      @click="() => handleProviderClick(provider)"
    >
      <Icon
        :name="getProviderConfig(provider).icon"
        :size="String(iconSize)"
        :class="getProviderConfig(provider).color"
      />
      <span :class="getProviderConfig(provider).color">
        Continue with {{ getProviderConfig(provider).name }}
      </span>
    </div>
    <div
      v-if="enabledProviders.length === 0"
      class="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
    >
      <p class="text-sm text-yellow-800 dark:text-yellow-200">
        <Icon name="mdi:information" class="inline mr-1" size="16" />
        No OAuth providers configured. Configure at least one provider in your .env file to enable
        SSO login.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import type { OAuthProvider } from '~/types/oauth'
import { getEnabledProviders, getProviderConfig } from '~/utils/oauth/providers'
import { useOAuth } from '~/composables/useOAuth'
import { useAuth } from '~/composables/useAuth'

interface Props {
  size?: 'small' | 'medium' | 'large'
  theme?: 'outline' | 'filled'
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  theme: 'filled',
  fullWidth: true,
})

const emit = defineEmits<{
  success: [user: unknown]
  error: [error: string]
}>()

const { initializeProvider, handleGitHubSignIn } = useOAuth()
const { handleGoogleCredential } = useAuth()

// Track temporary containers for cleanup (one per provider)
const tempContainerRefs = ref<Map<OAuthProvider, HTMLElement>>(new Map())
const cleanupTimeoutRefs = ref<Map<OAuthProvider, ReturnType<typeof setTimeout>>>(new Map())

// Track whether Google has been initialized globally (using sessionStorage for cross-component state)
// Google's documentation states initialize() should only be called once per page load
const isGoogleInitialized = () => {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('google_oauth_initialized') === 'true'
}

const setGoogleInitialized = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('google_oauth_initialized', 'true')
  }
}

// Cleanup function to remove temporary container for a specific provider
const cleanupTempContainer = (provider: OAuthProvider) => {
  const tempContainer = tempContainerRefs.value.get(provider)
  if (tempContainer && tempContainer.parentNode) {
    try {
      document.body.removeChild(tempContainer)
    } catch {
      // Container may have already been removed
    }
    tempContainerRefs.value.delete(provider)
  }
  const timeout = cleanupTimeoutRefs.value.get(provider)
  if (timeout) {
    clearTimeout(timeout)
    cleanupTimeoutRefs.value.delete(provider)
  }
}

// Cleanup all temporary containers
const cleanupAllTempContainers = () => {
  for (const provider of tempContainerRefs.value.keys()) {
    cleanupTempContainer(provider)
  }
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'text-xs py-2 px-3'
    case 'large':
      return 'text-base py-3 px-6'
    default:
      return 'text-sm py-2.5 px-4'
  }
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'small':
      return 16
    case 'large':
      return 24
    default:
      return 20
  }
})

const enabledProviders = computed(() => {
  try {
    return getEnabledProviders()
  } catch {
    // Return empty array if there's an error - better than crashing
    return []
  }
})

const handleProviderClick = async (provider: OAuthProvider) => {
  try {
    await initializeProvider(provider)

    switch (provider) {
      case 'google':
        // For Google, use the credential flow with a popup trigger
        if (typeof window !== 'undefined' && window.google?.accounts?.id) {
          const config = useRuntimeConfig()
          const clientId = config.public.googleClientId
          if (!clientId) {
            throw new Error('Google Client ID not configured')
          }

          // Initialize Google Sign-In only once per page load (globally, not per component)
          // Google's documentation states initialize() should only be called once
          if (!isGoogleInitialized()) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: async (response: { credential: string }) => {
                // Clean up any temporary containers
                cleanupTempContainer('google')
                const loginResult = await handleGoogleCredential(response)
                if (loginResult.success) {
                  emit('success', loginResult.user)
                } else {
                  emit('error', loginResult.error || 'Google login failed')
                }
              },
            })
            setGoogleInitialized()
          }

          // Clean up any existing container first
          cleanupTempContainer('google')

          // Create a temporary hidden container for Google's button
          const tempContainer = document.createElement('div')
          tempContainer.style.position = 'fixed'
          tempContainer.style.left = '-9999px'
          tempContainer.style.opacity = '0'
          tempContainer.style.pointerEvents = 'none'
          document.body.appendChild(tempContainer)
          tempContainerRefs.value.set('google', tempContainer)

          // Set a fallback timeout to ensure cleanup (5 minutes max)
          cleanupTimeoutRefs.value.set(
            'google',
            setTimeout(
              () => {
                cleanupTempContainer('google')
              },
              5 * 60 * 1000,
            ),
          )

          // Render Google's button in the hidden container
          window.google.accounts.id.renderButton(tempContainer, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
          })

          // Programmatically click the Google button after a short delay
          await nextTick()
          setTimeout(() => {
            const googleButton = tempContainer.querySelector('div[role="button"]') as HTMLElement
            if (googleButton) {
              googleButton.click()
            } else {
              cleanupTempContainer('google')
              emit('error', 'Failed to trigger Google sign-in. Please try again.')
            }
          }, 100)
        } else {
          throw new Error('Google Identity Services not loaded. Please refresh the page.')
        }
        return

      case 'github':
        // GitHub uses redirect flow, so this won't return
        await handleGitHubSignIn()
        return

      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  } catch (error) {
    // Clean up temporary container on error
    cleanupTempContainer(provider)
    const errorMessage =
      error instanceof Error ? error.message : `${getProviderConfig(provider).name} login failed`
    emit('error', errorMessage)
  }
}

// Initialize all enabled providers on mount
onMounted(async () => {
  for (const provider of enabledProviders.value) {
    try {
      await initializeProvider(provider)
    } catch (error) {
      console.warn(`[OAuthButtons] Failed to initialize ${provider}:`, error)
    }
  }
})

onUnmounted(() => {
  // Clean up all temporary containers when component is unmounted
  cleanupAllTempContainers()
})
</script>

<style scoped>
.oauth-button {
  min-height: 44px; /* Accessibility: minimum touch target */
}
</style>
