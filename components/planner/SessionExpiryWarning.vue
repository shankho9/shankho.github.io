<template>
  <Transition name="slide-down">
    <div
      v-if="showWarning"
      class="fixed top-4 right-4 z-50 max-w-sm bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg p-4 flex items-start gap-3"
    >
      <Icon
        name="mdi:alert-circle"
        class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
        size="20"
      />
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
          Session Expiring Soon
        </h3>
        <p class="text-xs text-amber-700 dark:text-amber-300 mb-2">
          Your admin session will expire in {{ timeRemaining }}. Please save your work.
        </p>
        <button
          class="text-xs font-medium text-amber-900 dark:text-amber-100 hover:underline"
          @click="refreshSession"
        >
          Refresh Session
        </button>
      </div>
      <button
        class="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0"
        aria-label="Dismiss"
        @click="dismissWarning"
      >
        <Icon name="mdi:close" size="18" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAdminAuth } from '~/composables/useAdminAuth'

const { isExpiringSoon, getTimeUntilExpiry, checkAuth } = useAdminAuth()
const showWarning = ref(false)
const dismissed = ref(false)
let updateInterval: ReturnType<typeof setInterval> | null = null

const timeRemaining = computed(() => {
  const remaining = getTimeUntilExpiry.value
  if (remaining <= 0) return 'less than a minute'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`
})

const refreshSession = async () => {
  await checkAuth(true) // Force refresh
  dismissed.value = true
  showWarning.value = false
}

const dismissWarning = () => {
  dismissed.value = true
  showWarning.value = false
}

const updateWarning = () => {
  if (dismissed.value) return
  showWarning.value = isExpiringSoon.value
}

onMounted(() => {
  updateWarning()
  // Update every 5 seconds to show accurate countdown
  updateInterval = setInterval(updateWarning, 5000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

// Watch for changes in expiry status
watch(isExpiringSoon, (newValue) => {
  if (!dismissed.value) {
    showWarning.value = newValue
  }
})
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease-out;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
