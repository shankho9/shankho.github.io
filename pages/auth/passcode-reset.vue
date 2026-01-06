<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Reset Utility Passcode
        </h2>
        <p v-if="!tokenValid" class="mt-2 text-center text-sm text-red-600 dark:text-red-400">
          Invalid or expired reset link. Please request a new one.
        </p>
        <p v-else class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your new utility passcode
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

      <form v-if="tokenValid" class="mt-8 space-y-6" @submit.prevent="handleResetPasscode">
        <div>
          <label
            for="newPasscode"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            New Passcode
          </label>
          <input
            id="newPasscode"
            v-model="newPasscode"
            name="newPasscode"
            type="password"
            autocomplete="new-password"
            required
            minlength="6"
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
            placeholder="New Passcode (min. 6 characters)"
          />
        </div>
        <div>
          <label
            for="confirmNewPasscode"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirm New Passcode
          </label>
          <input
            id="confirmNewPasscode"
            v-model="confirmNewPasscode"
            name="confirmNewPasscode"
            type="password"
            autocomplete="new-password"
            required
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
            placeholder="Confirm New Passcode"
          />
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Reset Passcode</span>
            <span v-else class="flex items-center">
              <Icon name="mdi:loading" class="animate-spin h-5 w-5 mr-2" />
              Resetting...
            </span>
          </button>
        </div>
      </form>

      <div class="text-center">
        <NuxtLink
          to="/auth/settings"
          class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Back to Settings
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()

const token = ref<string | null>(null)
const newPasscode = ref('')
const confirmNewPasscode = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)
const tokenValid = ref(false)

onMounted(() => {
  token.value = route.query.token as string
  if (!token.value) {
    errorMessage.value = 'No reset token provided.'
    tokenValid.value = false
  } else {
    // Assume token is valid for now, server will verify
    tokenValid.value = true
  }
})

const handleResetPasscode = async () => {
  errorMessage.value = ''
  if (newPasscode.value !== confirmNewPasscode.value) {
    errorMessage.value = 'New passcodes do not match.'
    return
  }
  if (newPasscode.value.length < 6) {
    errorMessage.value = 'Passcode must be at least 6 characters long.'
    return
  }

  isLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; error?: string; message?: string }>(
      '/api/auth/utility-passcode/reset',
      {
        method: 'POST',
        body: { token: token.value, newPasscode: newPasscode.value },
      },
    )

    if (response.success) {
      successMessage.value = response.message || 'Passcode reset successfully!'
      // Clear verification flag since passcode changed
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('utility_passcode_verified')
      }
      setTimeout(() => {
        router.push('/auth/settings')
      }, 2000)
    } else {
      errorMessage.value = response.error || 'Failed to reset passcode.'
      if (response.error?.includes('Invalid or expired')) {
        tokenValid.value = false
      }
    }
  } catch (error: unknown) {
    console.error('[Passcode Reset] Error:', error)
    errorMessage.value =
      (error as { data?: { error?: string } })?.data?.error ||
      (error instanceof Error ? error.message : 'An unexpected error occurred.')
  } finally {
    isLoading.value = false
  }
}
</script>
