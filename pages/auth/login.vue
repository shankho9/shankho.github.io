<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or
          <NuxtLink
            to="/auth/register"
            class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            create a new account
          </NuxtLink>
        </p>
      </div>

      <div v-if="successMessage" class="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
        <div class="flex">
          <Icon name="mdi:check-circle" class="h-5 w-5 text-green-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-green-800 dark:text-green-200">
              {{ successMessage }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div class="flex">
          <Icon name="mdi:alert-circle" class="h-5 w-5 text-red-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ errorMessage }}</p>
          </div>
        </div>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="Email address"
            />
          </div>
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="Password"
            />
          </div>
          <div v-if="requiresMFA">
            <label for="mfaCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              MFA Code
            </label>
            <input
              id="mfaCode"
              v-model="mfaCode"
              name="mfaCode"
              type="text"
              autocomplete="one-time-code"
              required
              maxlength="6"
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="000000"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end">
          <NuxtLink
            to="/auth/forgot-password"
            class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Forgot password?
          </NuxtLink>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Sign in</span>
            <span v-else class="flex items-center">
              <Icon name="mdi:loading" class="animate-spin h-5 w-5 mr-2" />
              Signing in...
            </span>
          </button>
        </div>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>

        <div>
          <div id="google-signin-button" class="flex justify-center"></div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const { login, initializeGoogleSignIn, handleGoogleCredential } = useAuth()

const route = useRoute()
const email = ref('')
const password = ref('')
const mfaCode = ref('')
const requiresMFA = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

// Check for password reset success message
onMounted(() => {
  if (route.query.reset === 'success') {
    successMessage.value = 'Password reset successful! You can now login with your new password.'
  }
})

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const result = await login(email.value, password.value, mfaCode.value || undefined)

    if (result.success) {
      // Redirect to home or intended page
      const redirect = router.currentRoute.value.query.redirect as string
      await router.push(redirect || '/')
    } else {
      errorMessage.value = result.error || 'Login failed'
      if (result.requiresMFA) {
        requiresMFA.value = true
      }
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  initializeGoogleSignIn()

  // Wait for Google to load, then render button
  const checkGoogle = setInterval(() => {
    if (window.google && window.google.accounts) {
      clearInterval(checkGoogle)
      const clientId = useRuntimeConfig().public.googleClientId
      if (clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            isLoading.value = true
            errorMessage.value = ''
            try {
              const result = await handleGoogleCredential(response)
              if (result.success) {
                const redirect = router.currentRoute.value.query.redirect as string
                await router.push(redirect || '/')
              } else {
                errorMessage.value = result.error || 'Google login failed'
              }
            } catch (error: unknown) {
              errorMessage.value =
                error instanceof Error ? error.message : 'An unexpected error occurred'
            } finally {
              isLoading.value = false
            }
          },
        })

        window.google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: '100%',
        })
      }
    }
  }, 100)
})
</script>
