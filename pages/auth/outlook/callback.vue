<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full space-y-8 p-8">
      <div v-if="isLoading" class="text-center">
        <Icon name="svg-spinners:180-ring" class="text-4xl text-blue-600 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Completing sign-in...</p>
      </div>
      <div v-else-if="error" class="text-center">
        <Icon name="mdi:alert-circle" class="text-4xl text-red-600 mb-4" />
        <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
        <NuxtLink
          to="/auth/login"
          class="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Login
        </NuxtLink>
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
const { loginWithOutlook } = useAuth()

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
    const storedState = sessionStorage.getItem('outlook_oauth_state')
    if (state !== storedState) {
      error.value = 'Invalid state parameter. Please try again.'
      isLoading.value = false
      return
    }

    sessionStorage.removeItem('outlook_oauth_state')

    // Exchange code for token and login
    const result = await loginWithOutlook(code)

    if (result.success) {
      // Redirect to intended page or home
      const redirect = route.query.redirect as string
      const redirectPath = redirect || '/'

      // Set loading to false before redirecting (consistent with GitHub callback)
      isLoading.value = false

      if (redirectPath.startsWith('/auth/')) {
        await router.push('/')
      } else {
        await router.push(redirectPath)
      }
    } else {
      error.value = result.error || 'Outlook login failed'
      isLoading.value = false
    }
  } catch (err: unknown) {
    console.error('[Outlook Callback] Error:', err)
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred during sign-in'
    isLoading.value = false
  }
})
</script>
