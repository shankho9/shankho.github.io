<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 overflow-x-hidden"
  >
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Rotate Utilities Passcode
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your current utilities passcode and set a new one. This passcode unlocks
          passcode-protected utilities (e.g. calculators).
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

      <!-- Step 1: Verify Old Passcode -->
      <form
        v-if="step === 'verify'"
        class="mt-8 space-y-6"
        @submit.prevent="handleVerifyOldPasscode"
      >
        <div>
          <label
            for="oldPasscode"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Current Passcode
          </label>
          <input
            id="oldPasscode"
            v-model="oldPasscode"
            name="oldPasscode"
            type="password"
            autocomplete="current-password"
            required
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
            placeholder="Enter current passcode"
          />
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Verify & Continue</span>
            <span v-else class="flex items-center">
              <Icon name="mdi:loading" class="animate-spin h-5 w-5 mr-2" />
              Verifying...
            </span>
          </button>
        </div>

        <div class="text-center">
          <button
            type="button"
            class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            @click="requestEmailReset"
          >
            Forgot your utilities passcode? Reset via email
          </button>
        </div>

        <div class="text-center">
          <NuxtLink
            to="/auth/settings"
            class="text-sm font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400"
          >
            Back to Settings
          </NuxtLink>
        </div>
      </form>

      <!-- Step 2: Set New Passcode -->
      <form v-if="step === 'setNew'" class="mt-8 space-y-6" @submit.prevent="handleSetNewPasscode">
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
            placeholder="Enter new passcode (min. 6 characters)"
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
            placeholder="Confirm new passcode"
          />
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Update Passcode</span>
            <span v-else class="flex items-center">
              <Icon name="mdi:loading" class="animate-spin h-5 w-5 mr-2" />
              Updating...
            </span>
          </button>
        </div>

        <div class="text-center">
          <button
            type="button"
            class="text-sm font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400"
            @click="step = 'verify'"
          >
            Back
          </button>
        </div>
      </form>

      <!-- Email Reset Request Success -->
      <div v-if="step === 'emailSent'" class="mt-8 space-y-6">
        <div class="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
          <div class="flex">
            <Icon name="mdi:email" class="h-5 w-5 text-blue-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Utilities passcode reset email sent!
              </p>
              <p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Please check your email and click the link to reset your utilities passcode.
              </p>
            </div>
          </div>
        </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const { isAuthenticated, checkAuth } = useAuth()

const step = ref<'verify' | 'setNew' | 'emailSent'>('verify')
const oldPasscode = ref('')
const verifiedOldPasscode = ref('') // Store verified passcode temporarily
const newPasscode = ref('')
const confirmNewPasscode = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

onMounted(async () => {
  await checkAuth()
  if (!isAuthenticated.value) {
    await router.push('/auth/login?redirect=' + encodeURIComponent('/auth/passcode-rotate'))
    return
  }
})

const handleVerifyOldPasscode = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean; error?: string }>(
      '/api/auth/utility-passcode/verify',
      {
        method: 'POST',
        body: { passcode: oldPasscode.value },
      },
    )

    if (response.success) {
      // Store verified passcode temporarily for rotation
      verifiedOldPasscode.value = oldPasscode.value
      oldPasscode.value = '' // Clear from input
      step.value = 'setNew'
    } else {
      errorMessage.value = response.error || 'Invalid passcode. Please try again.'
    }
  } catch (error: unknown) {
    console.error('[Passcode Rotate] Verify error:', error)
    errorMessage.value =
      (error as { data?: { error?: string } })?.data?.error ||
      (error instanceof Error ? error.message : 'An unexpected error occurred.')
  } finally {
    isLoading.value = false
  }
}

const handleSetNewPasscode = async () => {
  errorMessage.value = ''
  successMessage.value = ''

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
      '/api/auth/utility-passcode/rotate',
      {
        method: 'POST',
        body: { oldPasscode: verifiedOldPasscode.value, newPasscode: newPasscode.value },
      },
    )

    if (response.success) {
      successMessage.value = response.message || 'Passcode rotated successfully!'
      // Clear verification flag since passcode changed
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('utility_passcode_verified')
      }
      // Redirect to settings after a delay
      setTimeout(() => {
        router.push('/auth/settings')
      }, 2000)
    } else {
      errorMessage.value = response.error || 'Failed to rotate passcode.'
      // Reset to verify step if old passcode was wrong
      if (response.error?.includes('Invalid old passcode')) {
        step.value = 'verify'
        verifiedOldPasscode.value = ''
        oldPasscode.value = ''
        newPasscode.value = ''
        confirmNewPasscode.value = ''
      }
    }
  } catch (error: unknown) {
    console.error('[Passcode Rotate] Error:', error)
    errorMessage.value =
      (error as { data?: { error?: string } })?.data?.error ||
      (error instanceof Error ? error.message : 'An unexpected error occurred.')
  } finally {
    isLoading.value = false
  }
}

const requestEmailReset = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean; error?: string; message?: string }>(
      '/api/auth/utility-passcode/reset-request',
      {
        method: 'POST',
      },
    )

    if (response.success) {
      step.value = 'emailSent'
    } else {
      errorMessage.value = response.error || 'Failed to send reset email.'
    }
  } catch (error: unknown) {
    console.error('[Passcode Rotate] Email reset error:', error)
    errorMessage.value =
      (error as { data?: { error?: string } })?.data?.error ||
      (error instanceof Error ? error.message : 'An unexpected error occurred.')
  } finally {
    isLoading.value = false
  }
}
</script>
