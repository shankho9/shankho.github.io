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
                  <!-- OAuth Buttons -->
                  <OAuthButtons
                    size="large"
                    theme="outline"
                    @success="handleOAuthSuccess"
                    @error="handleOAuthError"
                  />

                  <!-- Divider (only show if OAuth providers are configured) -->
                  <div v-if="hasOAuthProviders" class="relative">
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
import { ref, watch, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import OAuthButtons from '~/components/auth/OAuthButtons.vue'
import { getEnabledProviders } from '~/utils/oauth/providers'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const isLoading = ref(false)
const errorMessage = ref('')
const router = useRouter()

// Check if any OAuth providers are configured
const hasOAuthProviders = computed(() => getEnabledProviders().length > 0)

const close = () => {
  errorMessage.value = ''
  emit('close')
}

const handleOAuthSuccess = async (_user: unknown) => {
  errorMessage.value = ''
  isLoading.value = false
  close()

  // Redirect to intended page or home
  const redirect = router.currentRoute.value.query.redirect as string
  const redirectPath = redirect || '/'

  // Don't redirect to login/auth pages after successful login
  if (redirectPath.startsWith('/auth/')) {
    await router.push('/')
  } else {
    await router.push(redirectPath)
  }
}

const handleOAuthError = (error: string) => {
  errorMessage.value = error || 'OAuth login failed. Please try again or use email login.'
  isLoading.value = false
}

// Close on escape key
let escapeHandler: ((e: KeyboardEvent) => void) | null = null

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
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
