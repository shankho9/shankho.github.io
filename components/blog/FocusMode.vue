<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const isFocusMode = ref(false)

const toggleFocusMode = () => {
  // Update the reactive ref - the watch will handle DOM updates and localStorage
  isFocusMode.value = !isFocusMode.value
}

const updateFocusMode = () => {
  if (typeof document === 'undefined') return

  const body = document.body
  const mainContent = document.querySelector('.blog-content-container')
  const sidebar = document.querySelector('.blog-sidebar')
  const header = document.querySelector('header')
  const footer = document.querySelector('footer')

  if (isFocusMode.value) {
    body.classList.add('focus-mode')
    if (mainContent) mainContent.classList.add('focus-mode-active')
    if (sidebar) sidebar.classList.add('hidden')
    if (header) header.classList.add('hidden')
    if (footer) footer?.classList.add('hidden')
  } else {
    body.classList.remove('focus-mode')
    if (mainContent) mainContent.classList.remove('focus-mode-active')
    if (sidebar) sidebar?.classList.remove('hidden')
    if (header) header?.classList.remove('hidden')
    if (footer) footer?.classList.remove('hidden')
  }
}

// Restore focus mode state from localStorage
onMounted(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('focus-mode')
    if (saved === 'true') {
      isFocusMode.value = true
      updateFocusMode()
    }
  }
})

// Save focus mode state
watch(isFocusMode, (newValue) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('focus-mode', String(newValue))
  }
  updateFocusMode()
})

// Cleanup on unmount - mirror the deactivation logic
onUnmounted(() => {
  if (typeof document === 'undefined') return

  const body = document.body
  const mainContent = document.querySelector('.blog-content-container')
  const sidebar = document.querySelector('.blog-sidebar')
  const header = document.querySelector('header')
  const footer = document.querySelector('footer')

  body.classList.remove('focus-mode')
  if (mainContent) mainContent.classList.remove('focus-mode-active')
  if (sidebar) sidebar.classList.remove('hidden')
  if (header) header.classList.remove('hidden')
  if (footer) footer?.classList.remove('hidden')
})
</script>

<template>
  <button
    type="button"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg border transition-colors',
      compact
        ? 'border-gray-200 bg-gray-50 px-2.5 py-2 text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700/80 dark:text-zinc-200 dark:hover:bg-slate-600'
        : 'border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    ]"
    :title="isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'"
    @click="toggleFocusMode"
  >
    <Icon :name="isFocusMode ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" class="h-5 w-5 shrink-0" />
    <span v-if="!compact" class="text-sm font-medium">
      {{ isFocusMode ? 'Exit Focus' : 'Focus Mode' }}
    </span>
    <span v-else class="sr-only">{{ isFocusMode ? 'Exit Focus Mode' : 'Focus Mode' }}</span>
  </button>
</template>

<style scoped>
/* Focus mode styles will be applied globally via body class */
</style>
