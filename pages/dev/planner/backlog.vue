<script setup lang="ts">
import type { Task, TaskPriority } from '~/server/api/planner/tasks.get'
import { getLocalDateString } from '~/utils/common/dateParser'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { fetchTasks } = useTasks()
const { updateTask, deleteTask } = useTasks()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const filterPriority = ref<TaskPriority | 'all'>('all')

const filteredTasks = computed(() => {
  if (filterPriority.value === 'all') return tasks.value
  return tasks.value.filter((t) => t.priority === filterPriority.value)
})

const loadTasks = async () => {
  isLoading.value = true
  try {
    const allTasks = await fetchTasks()
    const today = getLocalDateString()

    // Backlog logic:
    // - Everything that's NOT a MIT with date as today
    // - MIT without date as today
    tasks.value = allTasks.filter((task) => {
      const hasTodayDate = task.planned_date === today

      if (task.is_mit) {
        // MIT tasks: include only if they DON'T have today's date
        return !hasTodayDate
      } else {
        // Non-MIT tasks: include only if they have today's date
        return hasTodayDate
      }
    })
  } catch (error) {
    console.error('Failed to load backlog tasks:', error)
  } finally {
    isLoading.value = false
  }
}

const handleTaskUpdate = async (updatedTask: Task) => {
  const index = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (index !== -1) {
    tasks.value[index] = updatedTask
  }
}

const handleTaskDelete = async (id: number) => {
  try {
    await deleteTask(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

const handleMoveToToday = async (task: Task) => {
  try {
    const today = getLocalDateString()
    await updateTask(task.id, {
      status: 'today',
      planned_date: today,
    })
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
    // Optionally navigate to dashboard
    await navigateTo('/dev/planner')
  } catch (error) {
    console.error('Failed to move task to today:', error)
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Backlog</h1>
        <NuxtLink
          to="/dev/planner"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Dashboard
        </NuxtLink>
      </div>

      <div class="flex gap-2">
        <button
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filterPriority === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="filterPriority = 'all'"
        >
          All
        </button>
        <button
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filterPriority === 'high'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="filterPriority = 'high'"
        >
          High
        </button>
        <button
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filterPriority === 'medium'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="filterPriority = 'medium'"
        >
          Medium
        </button>
        <button
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filterPriority === 'low'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="filterPriority = 'low'"
        >
          Low
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
      ></div>
    </div>

    <div
      v-else-if="filteredTasks.length === 0"
      class="text-center py-12 text-gray-500 dark:text-gray-400"
    >
      No tasks in backlog
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="bg-white dark:bg-gray-800 border rounded-lg p-4"
      >
        <TaskCard :task="task" @update="handleTaskUpdate" @delete="handleTaskDelete" />
        <button
          class="mt-3 w-full px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          @click="handleMoveToToday(task)"
        >
          Move to Today
        </button>
      </div>
    </div>
  </div>
</template>
