<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 overflow-x-hidden"
  >
    <div class="max-w-md w-full space-y-8 p-8">
      <div v-if="isLoading" class="text-center">
        <Icon name="svg-spinners:180-ring" class="text-4xl text-gray-900 dark:text-white mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Completing sign-in...</p>
      </div>
      <div v-else-if="error" class="text-center">
        <Icon name="mdi:alert-circle" class="text-4xl text-red-600 mb-4" />
        <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
        <NuxtLink
          to="/auth/login"
          class="inline-block px-4 py-2 bg-[#24292e] text-white rounded-md hover:bg-[#1a1e22]"
        >
          Return to Login
        </NuxtLink>
      </div>
      <div v-else class="text-center">
        <Icon name="mdi:check-circle" class="text-4xl text-green-600 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Sign-in successful! Redirecting...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { loginWithGitHub, checkAuth, isAuthenticated } = useAuth()

const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const code = route.query.code as string
    const state = route.query.state as string

    if (!code) {
      error.value = 'Authorization code not found. Please try again.'
      isLoading.value = false
      return
    }

    // Verify state to prevent CSRF attacks
    const storedState = sessionStorage.getItem('github_oauth_state')
    if (state !== storedState) {
      error.value = 'Invalid state parameter. Please try again.'
      isLoading.value = false
      return
    }

    sessionStorage.removeItem('github_oauth_state')

    // Exchange code for token and login
    const result = await loginWithGitHub(code)

    if (result && result.success) {
      // Verify authentication state is set
      await checkAuth(true) // Force refresh

      // Wait a bit more to ensure state is fully updated
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Double-check authentication before redirecting
      if (!isAuthenticated.value) {
        await checkAuth(true)
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // Redirect to intended page or home
      const redirect = route.query.redirect as string
      let redirectPath = redirect || '/'

      // Clean up redirect path - remove any auth pages
      if (redirectPath.startsWith('/auth/')) {
        redirectPath = '/'
      }

      isLoading.value = false

      // Use replace instead of push to avoid back button issues
      await router.replace(redirectPath)
    } else {
      const errorMsg = result?.error || 'GitHub login failed'
      // Handle case where error might be a boolean or unexpected value
      if (errorMsg === 'true' || errorMsg === 'false' || errorMsg === true || errorMsg === false) {
        error.value = 'GitHub login failed. Please try again.'
      } else {
        error.value = String(errorMsg)
      }
      isLoading.value = false
    }
  } catch (err: unknown) {
    let errorMsg = 'An unexpected error occurred during sign-in'

    if (err instanceof Error) {
      errorMsg = err.message
    } else if (err && typeof err === 'object' && 'message' in err) {
      errorMsg = String(err.message)
    }

    // Handle case where error message might be a boolean
    if (errorMsg === 'true' || errorMsg === 'false' || errorMsg === true || errorMsg === false) {
      errorMsg = 'GitHub login failed. Please try again.'
    }

    error.value = errorMsg
    isLoading.value = false
  }
})
</script>
