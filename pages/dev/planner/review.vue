<script setup lang="ts">
import type { Task } from '~/server/api/planner/tasks.get'
import { getLocalDateString } from '~/utils/common/dateParser'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { fetchTasks, deleteTask } = useTasks()

const isLoading = ref(false)
const doneTasks = ref<Task[]>([])
const selectedTasks = ref<number[]>([])

// Metrics and insights
const metrics = computed(() => {
  const total = doneTasks.value.length
  const withTheme = doneTasks.value.filter((t) => t.theme).length
  const mits = doneTasks.value.filter((t) => t.is_mit).length
  const recentWeek = doneTasks.value.filter((task) => {
    if (!task.updated_at) return false
    const taskDate = new Date(task.updated_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return taskDate >= weekAgo
  }).length

  return {
    total,
    withTheme,
    withoutTheme: total - withTheme,
    mits,
    regular: total - mits,
    recentWeek,
  }
})

const tasksByTheme = computed(() => {
  const themeMap = new Map<string, Task[]>()
  doneTasks.value.forEach((task) => {
    const theme = task.theme || 'No Bucket'
    if (!themeMap.has(theme)) {
      themeMap.set(theme, [])
    }
    themeMap.get(theme)!.push(task)
  })
  return Array.from(themeMap.entries())
    .map(([theme, tasks]) => ({ theme, count: tasks.length, tasks }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5 buckets
})

const loadDoneTasks = async () => {
  isLoading.value = true
  try {
    const allTasks = await fetchTasks()
    doneTasks.value = allTasks.filter((task) => task.status === 'done')
  } catch (error) {
    console.error('Failed to load done tasks:', error)
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this task?')) return

  try {
    await deleteTask(id)
    doneTasks.value = doneTasks.value.filter((t) => t.id !== id)
    selectedTasks.value = selectedTasks.value.filter((tid) => tid !== id)
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

const handleBulkDelete = async () => {
  if (selectedTasks.value.length === 0) return
  if (!confirm(`Are you sure you want to delete ${selectedTasks.value.length} task(s)?`)) return

  try {
    await Promise.all(selectedTasks.value.map((id) => deleteTask(id)))
    doneTasks.value = doneTasks.value.filter((t) => !selectedTasks.value.includes(t.id))
    selectedTasks.value = []
    await loadDoneTasks()
  } catch (error) {
    console.error('Failed to delete tasks:', error)
  }
}

const toggleSelectTask = (id: number) => {
  const index = selectedTasks.value.indexOf(id)
  if (index > -1) {
    selectedTasks.value.splice(index, 1)
  } else {
    selectedTasks.value.push(id)
  }
}

const selectAll = () => {
  if (selectedTasks.value.length === doneTasks.value.length) {
    selectedTasks.value = []
  } else {
    selectedTasks.value = doneTasks.value.map((t) => t.id)
  }
}

onMounted(() => {
  loadDoneTasks()
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Review - Done Tasks
        </h1>
        <div class="flex items-center gap-2 flex-wrap">
          <NuxtLink
            to="/dev/planner"
            class="p-2.5 sm:p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title="Dashboard"
          >
            <Icon name="mdi:view-dashboard" size="20" />
          </NuxtLink>
          <NuxtLink
            to="/dev/planner/tasks"
            class="p-2.5 sm:p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title="Manage Tasks"
          >
            <Icon name="mdi:format-list-checkbox" size="20" />
          </NuxtLink>
          <NuxtLink
            :to="`/dev/planner/print/today?date=${getLocalDateString()}`"
            class="p-2.5 sm:p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title="Print Daily Plan"
          >
            <Icon name="mdi:printer" size="20" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <div
        class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
      >
        <div class="text-2xl font-bold text-green-700 dark:text-green-300">{{ metrics.total }}</div>
        <div class="text-sm text-green-600 dark:text-green-400">Total Completed</div>
      </div>
      <div
        class="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
      >
        <div class="text-2xl font-bold text-purple-700 dark:text-purple-300">
          {{ metrics.mits }}
        </div>
        <div class="text-sm text-purple-600 dark:text-purple-400">MITs Completed</div>
      </div>
      <div
        class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ metrics.regular }}</div>
        <div class="text-sm text-blue-600 dark:text-blue-400">Regular Tasks</div>
      </div>
      <div
        class="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
      >
        <div class="text-2xl font-bold text-orange-700 dark:text-orange-300">
          {{ metrics.recentWeek }}
        </div>
        <div class="text-sm text-orange-600 dark:text-orange-400">Last 7 Days</div>
      </div>
      <div
        class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
      >
        <div class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
          {{ metrics.withTheme }}
        </div>
        <div class="text-sm text-yellow-600 dark:text-yellow-400">With Bucket</div>
      </div>
    </div>

    <!-- Top Themes Insight -->
    <div
      v-if="tasksByTheme.length > 0"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
    >
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Top Completed Themes</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="item in tasksByTheme"
          :key="item.theme"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">{{ item.theme }}</h3>
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{
              item.count
            }}</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all"
              :style="{ width: `${(item.count / metrics.total) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="doneTasks.length > 0" class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="selectedTasks.length === doneTasks.length && doneTasks.length > 0"
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            @change="selectAll"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">Select All</span>
        </label>
        <span v-if="selectedTasks.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
          {{ selectedTasks.length }} selected
        </span>
      </div>
      <button
        v-if="selectedTasks.length > 0"
        class="px-4 py-2.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 text-sm sm:text-base"
        @click="handleBulkDelete"
      >
        Delete Selected ({{ selectedTasks.length }})
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
      ></div>
    </div>

    <div v-else-if="doneTasks.length === 0" class="text-center py-12">
      <Icon
        name="mdi:check-circle-outline"
        size="64"
        class="mx-auto mb-4 text-gray-400 dark:text-gray-600"
      />
      <p class="text-lg text-gray-500 dark:text-gray-400">No completed tasks found</p>
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div
          v-for="task in doneTasks"
          :key="task.id"
          class="px-3 sm:px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3"
        >
          <input
            type="checkbox"
            :checked="selectedTasks.includes(task.id)"
            class="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 touch-manipulation flex-shrink-0"
            @change="toggleSelectTask(task.id)"
          />
          <div class="flex-1 min-w-0">
            <div
              class="font-medium text-base sm:text-sm text-gray-900 dark:text-gray-100 break-words"
            >
              {{ task.title }}
            </div>
            <div v-if="task.theme" class="text-sm sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              Bucket: {{ task.theme }}
            </div>
          </div>
          <button
            class="px-4 py-2 sm:px-3 sm:py-1 text-sm sm:text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
            @click="handleDelete(task.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
