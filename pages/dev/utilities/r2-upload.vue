<script setup lang="ts">
import DevR2Upload from '~/components/dev/R2Upload.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin'],
})
</script>

<template>
  <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            R2 Upload
          </h1>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Upload app binaries and resources to Cloudflare R2 object storage
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
    <DevR2Upload />
  </div>
</template>
