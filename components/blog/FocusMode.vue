<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

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
    class="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
    :title="isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'"
    @click="toggleFocusMode"
  >
    <Icon :name="isFocusMode ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" class="w-5 h-5" />
    <span class="text-sm font-medium">{{ isFocusMode ? 'Exit Focus' : 'Focus Mode' }}</span>
  </button>
</template>

<style scoped>
/* Focus mode styles will be applied globally via body class */
</style>
