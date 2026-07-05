<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8 overflow-x-hidden"
  >
    <div class="max-w-md w-full">
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-8 space-y-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Rotate Admin Passcode</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Enter your current admin passcode and set a new one. This passcode unlocks admin-only
            utilities (Analytics & Insights, Site Settings).
          </p>
        </div>

        <div v-if="errorMessage" class="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
          <div class="flex">
            <Icon name="mdi:alert-circle" class="h-5 w-5 text-red-400 shrink-0" />
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ errorMessage }}</p>
            </div>
          </div>
        </div>

        <div v-if="successMessage" class="rounded-md bg-green-50 dark:bg-green-900/20 p-3">
          <div class="flex">
            <Icon name="mdi:check-circle" class="h-5 w-5 text-green-400 shrink-0" />
            <div class="ml-3">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                {{ successMessage }}
              </p>
            </div>
          </div>
        </div>

        <form v-if="step === 'verify'" class="space-y-4" @submit.prevent="handleVerifyOldPasscode">
          <div>
            <label
              for="oldPasscode"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Current admin passcode
            </label>
            <input
              id="oldPasscode"
              v-model="oldPasscode"
              name="oldPasscode"
              type="password"
              autocomplete="current-password"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              placeholder="Enter current admin passcode"
            />
          </div>
          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!isLoading">Verify & Continue</span>
              <span v-else class="flex items-center">
                <Icon name="mdi:loading" class="animate-spin h-4 w-4 mr-2" />
                Verifying...
              </span>
            </button>
          </div>
          <div class="text-center pt-1">
            <NuxtLink
              to="/auth/settings"
              class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Back to Settings
            </NuxtLink>
          </div>
        </form>

        <form
          v-else-if="step === 'setNew'"
          class="space-y-4"
          @submit.prevent="handleSetNewPasscode"
        >
          <div>
            <label
              for="newPasscode"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New admin passcode
            </label>
            <input
              id="newPasscode"
              v-model="newPasscode"
              name="newPasscode"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
              class="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              placeholder="Enter new passcode (min. 6 characters)"
            />
          </div>
          <div>
            <label
              for="confirmNewPasscode"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm new passcode
            </label>
            <input
              id="confirmNewPasscode"
              v-model="confirmNewPasscode"
              name="confirmNewPasscode"
              type="password"
              autocomplete="new-password"
              required
              class="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              placeholder="Confirm new passcode"
            />
          </div>
          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!isLoading">Update admin passcode</span>
              <span v-else class="flex items-center">
                <Icon name="mdi:loading" class="animate-spin h-4 w-4 mr-2" />
                Updating...
              </span>
            </button>
          </div>
          <div class="text-center pt-1">
            <button
              type="button"
              class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              @click="step = 'verify'"
            >
              Back
            </button>
          </div>
        </form>
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
const { isAuthenticated, isAdmin, checkAuth, signOut } = useAuth()

const step = ref<'verify' | 'setNew'>('verify')
const oldPasscode = ref('')
const verifiedOldPasscode = ref('')
const newPasscode = ref('')
const confirmNewPasscode = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

onMounted(async () => {
  await checkAuth()
  if (!isAuthenticated.value) {
    await router.push('/auth/login?redirect=' + encodeURIComponent('/auth/admin-passcode-rotate'))
    return
  }
  if (!isAdmin.value) {
    await signOut()
    await router.push('/')
    return
  }
})

const handleVerifyOldPasscode = async () => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; error?: string }>(
      '/api/auth/admin-passcode/verify',
      { method: 'POST', body: { passcode: oldPasscode.value } },
    )
    if (response.success) {
      verifiedOldPasscode.value = oldPasscode.value
      oldPasscode.value = ''
      step.value = 'setNew'
    } else {
      errorMessage.value = response.error || 'Invalid passcode. Please try again.'
    }
  } catch (e: unknown) {
    const data = e && typeof e === 'object' && 'data' in e ? (e.data as { error?: string }) : null
    errorMessage.value = data?.error || (e instanceof Error ? e.message : 'Verification failed')
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
      '/api/auth/admin-passcode/rotate',
      {
        method: 'POST',
        body: { oldPasscode: verifiedOldPasscode.value, newPasscode: newPasscode.value },
      },
    )
    if (response.success) {
      successMessage.value = response.message || 'Admin passcode rotated successfully.'
      if (typeof window !== 'undefined') sessionStorage.removeItem('admin_passcode_verified')
      setTimeout(() => router.push('/auth/settings'), 2000)
    } else {
      errorMessage.value = response.error || 'Failed to rotate passcode.'
      if (response.error?.toLowerCase().includes('invalid old passcode')) {
        step.value = 'verify'
        verifiedOldPasscode.value = ''
        oldPasscode.value = ''
        newPasscode.value = ''
        confirmNewPasscode.value = ''
      }
    }
  } catch (e: unknown) {
    const data = e && typeof e === 'object' && 'data' in e ? (e.data as { error?: string }) : null
    errorMessage.value = data?.error || (e instanceof Error ? e.message : 'An error occurred')
  } finally {
    isLoading.value = false
  }
}
</script>
