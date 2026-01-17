<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  page?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  page: '/',
  showLabel: true,
  size: 'md',
})

const visitorCount = ref<number | null>(null)
const isLoading = ref(true)
const updateInterval = ref<NodeJS.Timeout | null>(null)

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

const fetchVisitorCount = async () => {
  try {
    const data = await $fetch<{ count: number }>('/api/analytics/visitor-count', {
      params: {
        page: props.page,
      },
    })
    visitorCount.value = data.count
    isLoading.value = false
  } catch (error) {
    console.warn('[VisitorCounter] Failed to fetch visitor count:', error)
    isLoading.value = false
  }
}

onMounted(() => {
  fetchVisitorCount()

  // Update every 30 seconds
  updateInterval.value = setInterval(() => {
    fetchVisitorCount()
  }, 30000)
})

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
})
</script>

<template>
  <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400" :class="sizeClasses[size]">
    <Icon name="mdi:account-group" size="16" class="flex-shrink-0" />
    <span v-if="showLabel" class="font-medium">Visitors:</span>
    <span v-if="isLoading" class="animate-pulse">...</span>
    <span v-else-if="visitorCount !== null" class="font-semibold text-sky-600 dark:text-sky-400">
      {{ visitorCount.toLocaleString() }}
    </span>
    <span v-else class="text-gray-400">N/A</span>
  </div>
</template>
