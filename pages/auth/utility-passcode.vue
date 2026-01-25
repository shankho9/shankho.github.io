<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8 overflow-x-hidden"
  >
    <div class="max-w-md w-full">
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-8 space-y-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Utilities Passcode Required
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Enter your utilities passcode to access passcode-protected utilities.
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

        <div v-if="needsRotation" class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
          <div class="flex">
            <Icon name="mdi:alert" class="h-5 w-5 text-yellow-400 shrink-0" />
            <div class="ml-3">
              <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Your utilities passcode needs to be rotated. Update it in
                <NuxtLink to="/auth/settings" class="underline">settings</NuxtLink>.
              </p>
            </div>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleVerify">
          <div>
            <label
              for="passcode"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Utilities passcode
            </label>
            <input
              id="passcode"
              v-model="passcode"
              name="passcode"
              type="password"
              required
              autofocus
              class="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              placeholder="Enter utilities passcode"
            />
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading || needsRotation"
              class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!isLoading">Verify</span>
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
              Set or update utilities passcode
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { verifyUtilityPasscode, checkUtilityPasscodeStatus, isAuthenticated, checkAuth } = useAuth()

const passcode = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const needsRotation = ref(false)

const handleVerify = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const result = await verifyUtilityPasscode(passcode.value)

    if (result.success) {
      // Store verification in sessionStorage
      sessionStorage.setItem('utility_passcode_verified', 'true')

      // Redirect to intended page or default
      const redirect = (route.query.redirect as string) || '/dev/planner'
      await router.push(redirect)
    } else {
      errorMessage.value = result.error || 'Invalid passcode'
      passcode.value = ''
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
    passcode.value = ''
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  // Check authentication first
  if (!isAuthenticated.value) {
    await checkAuth()
    if (!isAuthenticated.value) {
      await router.push('/auth/login?redirect=' + encodeURIComponent(route.fullPath))
      return
    }
  }

  // Check passcode status
  const status = await checkUtilityPasscodeStatus()
  needsRotation.value = status.needsRotation

  if (needsRotation.value) {
    errorMessage.value =
      'Your utilities passcode needs to be rotated. Please update it in settings.'
  }
})
</script>
