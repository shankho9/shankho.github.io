<template>
  <div class="space-y-6 w-full">
    <div
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
    >
      <p class="text-blue-800 dark:text-blue-200">
        <Icon name="mdi:information" class="inline mr-2" />
        Cache management helps clear stale data and improve performance. Use with caution in
        production.
      </p>
    </div>

    <!-- Cache Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div
        class="bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600"
      >
        <h3 class="text-lg font-semibold mb-4">Nuxt Cache</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Clear Nuxt/Nitro application cache. This will clear server-side cached data.
        </p>
        <button
          :disabled="isClearing"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="clearNuxtCache"
        >
          {{ isClearing ? 'Clearing...' : 'Clear Nuxt Cache' }}
        </button>
      </div>

      <div
        class="bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600"
      >
        <h3 class="text-lg font-semibold mb-4">Browser Cache</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Clear browser cache. Users will need to hard refresh (Ctrl+Shift+R or Cmd+Shift+R).
        </p>
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          @click="clearBrowserCache"
        >
          Instructions
        </button>
      </div>
    </div>

    <!-- Status Messages -->
    <div
      v-if="successMessage"
      class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
    >
      <p class="text-green-800 dark:text-green-200">
        <Icon name="mdi:check-circle" class="inline mr-2" />
        {{ successMessage }}
      </p>
    </div>

    <div
      v-if="errorMessage"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-red-800 dark:text-red-200">
        <Icon name="mdi:alert-circle" class="inline mr-2" />
        {{ errorMessage }}
      </p>
    </div>

    <!-- Cache Information -->
    <div
      class="bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600"
    >
      <h3 class="text-lg font-semibold mb-4">Cache Information</h3>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Cache Type:</span>
          <span class="font-medium">Nuxt/Nitro Server Cache</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Storage:</span>
          <span class="font-medium">In-memory / Nitro Cache</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Last Cleared:</span>
          <span class="font-medium">{{ lastCleared || 'Never' }}</span>
        </div>
      </div>
    </div>

    <!-- Browser Cache Instructions Modal -->
    <div
      v-if="showBrowserInstructions"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showBrowserInstructions = false"
    >
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md mx-4" @click.stop>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold">Clear Browser Cache</h3>
          <button
            class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
            @click="showBrowserInstructions = false"
          >
            <Icon name="mdi:close" size="24" />
          </button>
        </div>
        <div class="space-y-3 text-sm">
          <p class="text-gray-600 dark:text-gray-400">
            To clear browser cache, use one of these methods:
          </p>
          <div class="space-y-2">
            <div>
              <strong>Windows/Linux:</strong> Press
              <kbd class="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">Ctrl + Shift + R</kbd>
            </div>
            <div>
              <strong>Mac:</strong> Press
              <kbd class="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">Cmd + Shift + R</kbd>
            </div>
            <div>
              <strong>Or:</strong> Open DevTools (F12) → Right-click refresh button → "Empty Cache
              and Hard Reload"
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isClearing = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const lastCleared = ref<string | null>(null)
const showBrowserInstructions = ref(false)

const clearNuxtCache = async () => {
  isClearing.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; message?: string; error?: string }>(
      '/api/admin/cache',
      {
        method: 'POST',
        body: { action: 'clear' },
      },
    )

    if (response.success) {
      successMessage.value = response.message || 'Cache cleared successfully'
      lastCleared.value = new Date().toLocaleString()
    } else {
      errorMessage.value = response.error || 'Failed to clear cache'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to clear cache'
  } finally {
    isClearing.value = false
  }
}

const clearBrowserCache = () => {
  showBrowserInstructions.value = true
}
</script>
