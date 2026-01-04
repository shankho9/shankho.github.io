<script setup lang="ts">
import DevLocations from '~/components/dev/Locations.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Location Manager
          </h1>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Add and manage locations on your travel map
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

    <!-- Location Manager Component -->
    <DevLocations />
  </div>
</template>
