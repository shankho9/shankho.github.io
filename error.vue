<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isChunkError = computed(() => {
  const message = props.error?.message || ''
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed')
  )
})

const title = computed(() => {
  if (isChunkError.value) return 'This page needs a refresh'
  if (props.error?.statusCode === 404) return 'Page not found'
  return 'Something went wrong'
})

const message = computed(() => {
  if (isChunkError.value) {
    return 'The site was updated while this tab was open. Reload to load the latest version.'
  }
  if (props.error?.statusCode === 404) {
    return "The page you're looking for doesn't exist or has been moved."
  }
  return props.error?.statusMessage || props.error?.message || 'An unexpected error occurred.'
})

const handleReload = () => {
  window.location.reload()
}

const handleGoHome = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div
    class="min-h-screen bg-[#F1F2F4] dark:bg-slate-950 flex items-center justify-center px-4 py-16"
  >
    <div class="max-w-md w-full text-center">
      <div class="mb-6 flex justify-center">
        <Icon
          :name="isChunkError ? 'mdi:refresh' : 'mdi:alert-circle-outline'"
          size="64"
          class="text-red-500 dark:text-red-400"
        />
      </div>

      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {{ title }}
      </h1>

      <p class="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        {{ message }}
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          class="px-6 py-2.5 rounded-md font-medium bg-sky-600 hover:bg-sky-700 text-white transition-colors"
          @click="handleReload"
        >
          Reload page
        </button>
        <button
          v-if="!isChunkError"
          class="px-6 py-2.5 rounded-md font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          @click="handleGoHome"
        >
          Go home
        </button>
      </div>
    </div>
  </div>
</template>
