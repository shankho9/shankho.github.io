<template>
  <div
    :id="buttonId"
    :class="[
      'oauth-button',
      providerConfig.bgColor,
      providerConfig.hoverColor,
      fullWidth ? 'w-full' : '',
      sizeClasses,
      'flex items-center justify-center gap-3 px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors cursor-pointer',
    ]"
    @click="handleClick"
  >
    <Icon :name="providerConfig.icon" :size="iconSize" :class="providerConfig.color" />
    <span :class="providerConfig.color"> Continue with {{ providerConfig.name }} </span>
  </div>
</template>

<script setup lang="ts">
import type { OAuthProvider } from '~/types/oauth'
import { getProviderConfig } from '~/utils/oauth/providers'
import { useOAuth } from '~/composables/useOAuth'
import { useAuth } from '~/composables/useAuth'

interface Props {
  provider: OAuthProvider
  buttonId?: string
  size?: 'small' | 'medium' | 'large'
  theme?: 'outline' | 'filled'
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  buttonId: () => `oauth-button-${Math.random().toString(36).substr(2, 9)}`,
  size: 'medium',
  theme: 'filled',
  fullWidth: false,
})

const emit = defineEmits<{
  success: [user: unknown]
  error: [error: string]
}>()

const providerConfig = computed(() => getProviderConfig(props.provider))
const { initializeProvider, handleAppleSignIn, handleOutlookSignIn, handleGitHubSignIn } =
  useOAuth()
const { handleGoogleCredential } = useAuth()

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

const handleClick = async () => {
  try {
    await initializeProvider(props.provider)

    let result

    switch (props.provider) {
      case 'google':
        // For Google, use the credential flow with a popup trigger
        if (typeof window !== 'undefined' && window.google?.accounts?.id) {
          const config = useRuntimeConfig()
          const clientId = config.public.googleClientId
          if (!clientId) {
            throw new Error('Google Client ID not configured')
          }

          // Create a temporary hidden container for Google's button
          const tempContainer = document.createElement('div')
          tempContainer.style.position = 'fixed'
          tempContainer.style.left = '-9999px'
          tempContainer.style.opacity = '0'
          tempContainer.style.pointerEvents = 'none'
          document.body.appendChild(tempContainer)

          // Initialize Google Sign-In
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
              document.body.removeChild(tempContainer)
              const loginResult = await handleGoogleCredential(response)
              if (loginResult.success) {
                emit('success', loginResult.user)
              } else {
                emit('error', loginResult.error || 'Google login failed')
              }
            },
          })

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
              document.body.removeChild(tempContainer)
              emit('error', 'Failed to trigger Google sign-in. Please try again.')
            }
          }, 100)
        } else {
          throw new Error('Google Identity Services not loaded. Please refresh the page.')
        }
        return

      case 'apple':
        result = await handleAppleSignIn()
        break

      case 'outlook':
        result = await handleOutlookSignIn()
        // Outlook uses redirect, so this won't return
        return

      case 'github':
        result = await handleGitHubSignIn()
        // GitHub uses redirect, so this won't return
        return

      default:
        throw new Error(`Unsupported provider: ${props.provider}`)
    }

    if (result?.success) {
      emit('success', result.user)
    } else {
      emit('error', result?.error || `${providerConfig.value.name} login failed`)
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : `${providerConfig.value.name} login failed`
    emit('error', errorMessage)
  }
}

onMounted(async () => {
  // Initialize provider-specific scripts
  try {
    await initializeProvider(props.provider)
  } catch (error) {
    console.warn(`[OAuthButton] Failed to initialize ${props.provider}:`, error)
  }
})
</script>

<style scoped>
.oauth-button {
  min-height: 44px; /* Accessibility: minimum touch target */
}
</style>
