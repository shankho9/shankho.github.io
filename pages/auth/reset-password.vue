<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 overflow-x-hidden"
  >
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Reset Password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your new password below.
        </p>
      </div>

      <div v-if="errorMessage" class="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div class="flex">
          <Icon name="mdi:alert-circle" class="h-5 w-5 text-red-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ errorMessage }}</p>
          </div>
        </div>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleResetPassword">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New Password
            </label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="Password (min 8 characters)"
            />
          </div>
          <div>
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              placeholder="Confirm password"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading || password !== confirmPassword"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Reset Password</span>
            <span v-else class="flex items-center">
              <Icon name="mdi:loading" class="animate-spin h-5 w-5 mr-2" />
              Resetting...
            </span>
          </button>
        </div>

        <div
          v-if="password && confirmPassword && password !== confirmPassword"
          class="text-sm text-red-600 dark:text-red-400 text-center"
        >
          Passwords do not match
        </div>

        <div class="text-center">
          <NuxtLink
            to="/auth/login"
            class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Back to login
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const token = computed(() => route.query.token as string)

const handleResetPassword = async () => {
  if (!token.value) {
    errorMessage.value = 'Invalid or missing reset token'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long'
    return
  }

  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean; error?: string }>(
      '/api/auth/password/reset',
      {
        method: 'POST',
        body: {
          token: token.value,
          password: password.value,
        },
      },
    )

    if (response.success) {
      // Redirect to login with success message
      await router.push('/auth/login?reset=success')
    } else {
      errorMessage.value = response.error || 'Failed to reset password'
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}

// Check if token is present
onMounted(() => {
  if (!token.value) {
    errorMessage.value = 'Invalid or missing reset token. Please use the link from your email.'
  }
})
</script>
