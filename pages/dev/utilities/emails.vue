<script setup lang="ts">
import { onMounted } from 'vue'
import DevEmails from '~/components/dev/Emails.vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'default',
  middleware: 'auth-utilities',
})

const { isAuthenticated, checkAuth } = useAuth()

onMounted(async () => {
  await checkAuth()
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login?redirect=' + encodeURIComponent(useRoute().fullPath))
  }
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
    <div v-if="!isAuthenticated" class="max-w-md mx-auto">
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        <h1 class="text-3xl font-bold mb-2">Email Logs</h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Authentication required</p>
        <NuxtLink
          to="/auth/login?redirect=/dev/utilities/emails"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Sign In
        </NuxtLink>
      </div>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-4 sm:mb-6">
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
        >
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Email Logs
            </h1>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              View email alert history and new user notifications
            </p>
          </div>
          <NuxtLink
            to="/dev"
            class="px-4 py-2.5 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 whitespace-nowrap"
          >
            Back to Dev Tools
          </NuxtLink>
        </div>
      </div>

      <!-- Email Logs Component -->
      <DevEmails />
    </div>
  </div>
</template>
