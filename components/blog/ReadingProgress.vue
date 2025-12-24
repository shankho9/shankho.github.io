<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)

function updateProgress() {
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  const scrollTop = window.scrollY || document.documentElement.scrollTop

  // Calculate progress percentage
  const scrollableHeight = documentHeight - windowHeight
  const scrolled = scrollTop

  if (scrollableHeight > 0) {
    progress.value = Math.min(100, Math.round((scrolled / scrollableHeight) * 100))
  } else {
    progress.value = 100
  }
}

onMounted(() => {
  updateProgress()
  window.addEventListener('scroll', updateProgress, { passive: true })
  window.addEventListener('resize', updateProgress, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress)
  window.removeEventListener('resize', updateProgress)
})
</script>

<template>
  <div
    class="reading-progress fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-slate-800 z-50"
    role="progressbar"
    :aria-valuenow="progress"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="`Reading progress: ${progress}%`"
  >
    <div
      class="reading-progress-bar h-full bg-sky-700 dark:bg-sky-400 transition-all duration-150 ease-out"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>

<style scoped>
.reading-progress {
  pointer-events: none;
}

.reading-progress-bar {
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.5);
}
</style>
