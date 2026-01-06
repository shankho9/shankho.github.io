<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Utility Passcode Required
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your utility passcode to access dev utilities
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

      <div v-if="needsRotation" class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <div class="flex">
          <Icon name="mdi:alert" class="h-5 w-5 text-yellow-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Your passcode needs to be rotated. Please update it in
              <NuxtLink to="/auth/settings" class="underline">settings</NuxtLink>.
            </p>
          </div>
        </div>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleVerify">
        <div>
          <label for="passcode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Passcode
          </label>
          <input
            id="passcode"
            v-model="passcode"
            name="passcode"
            type="password"
            required
            autofocus
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
            placeholder="Enter passcode"
          />
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading || needsRotation"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">Verify</span>
            <span v-else class="flex items-center">
              <Icon name="mdi:loading" class="animate-spin h-5 w-5 mr-2" />
              Verifying...
            </span>
          </button>
        </div>

        <div class="text-center">
          <NuxtLink
            to="/auth/settings"
            class="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Set or update passcode
          </NuxtLink>
        </div>
      </form>
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
    errorMessage.value = 'Your passcode needs to be rotated. Please update it in settings.'
  }
})
</script>
