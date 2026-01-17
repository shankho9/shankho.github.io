<script setup lang="ts">
import { usePWA } from '~/composables/usePWA'

const { isInstallable, isInstalled, promptInstall, isOnline } = usePWA()
const showPrompt = ref(false)
const isDismissed = ref(false)

// Show prompt if installable and not dismissed
watch(
  [isInstallable, isInstalled],
  ([installable, installed]) => {
    if (installable && !installed && !isDismissed.value) {
      // Small delay to avoid showing immediately
      setTimeout(() => {
        showPrompt.value = true
      }, 3000)
    }
  },
  { immediate: true },
)

function handleInstall() {
  promptInstall().then((success) => {
    if (success) {
      showPrompt.value = false
    }
  })
}

function handleDismiss() {
  showPrompt.value = false
  isDismissed.value = true
  // Remember dismissal for this session
  sessionStorage.setItem('pwa-install-dismissed', 'true')
}

onMounted(() => {
  // Check if user dismissed before
  if (sessionStorage.getItem('pwa-install-dismissed') === 'true') {
    isDismissed.value = true
  }
})
</script>

<template>
  <!-- PWA Install Prompt -->
  <Transition name="slide-up">
    <div
      v-if="showPrompt && isInstallable && !isInstalled && isOnline"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4"
      >
        <div class="flex-shrink-0">
          <Icon name="mdi:download" size="24" class="text-sky-600 dark:text-sky-400" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Install Nomadic Notions
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Install this app for offline access and faster loading.
          </p>
          <div class="flex gap-2">
            <button
              class="px-3 py-1.5 text-xs font-medium bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
              @click="handleInstall"
            >
              Install
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              @click="handleDismiss"
            >
              Not Now
            </button>
          </div>
        </div>
        <button
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          @click="handleDismiss"
        >
          <Icon name="mdi:close" size="20" />
        </button>
      </div>
    </div>
  </Transition>

  <!-- Offline Indicator -->
  <Transition name="fade">
    <div
      v-if="!isOnline"
      class="fixed top-16 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50"
    >
      <div
        class="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-lg p-3 flex items-center gap-3"
      >
        <Icon name="mdi:wifi-off" size="20" class="text-yellow-700 dark:text-yellow-300" />
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          You're offline. Some features may be limited.
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
