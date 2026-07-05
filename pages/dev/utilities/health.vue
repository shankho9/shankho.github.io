<script setup lang="ts">
import { onMounted } from 'vue'
import DevHealth from '~/components/dev/Health.vue'
import { useDevUtilityAuth } from '~/composables/useDevUtilityAuth'

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin'],
})

const { isAuthenticated, ensureAuth } = useDevUtilityAuth()
onMounted(ensureAuth)
</script>

<template>
  <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <div v-if="!isAuthenticated" class="max-w-md mx-auto">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-8 text-center"
      >
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          API Health Check
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Sign in to access this utility.</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            :to="`/auth/login?redirect=${encodeURIComponent($route.fullPath)}`"
            class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/"
            class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 transition-colors"
          >
            Back to home
          </NuxtLink>
        </div>
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
              API Health Check
            </h1>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Check API endpoints and database connectivity status
            </p>
          </div>
          <NuxtLink
            to="/dev"
            class="inline-flex items-center px-2.5 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors touch-manipulation"
          >
            <Icon name="mdi:arrow-left" class="mr-1.5 text-base" />
            Back to Utilities
          </NuxtLink>
        </div>
      </div>

      <!-- API Health Component -->
      <DevHealth />
    </div>
  </div>
</template>
