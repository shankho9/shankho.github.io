<script setup lang="ts">
import type { Task } from '~/server/api/planner/tasks.get'
import { getLocalDateString } from '~/utils/common/dateParser'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { fetchTasks, fetchThemes } = useTasks()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const availableThemes = ref<string[]>([])
const selectedDate = ref(getLocalDateString())

// Statistics
const stats = computed(() => {
  const today = selectedDate.value
  const todayTasks = tasks.value.filter((t) => t.planned_date === today)
  const allTasks = tasks.value

  return {
    total: allTasks.length,
    today: todayTasks.length,
    mits: allTasks.filter((t) => t.is_mit).length,
    todayMits: todayTasks.filter((t) => t.is_mit).length,
    doing: allTasks.filter((t) => t.status === 'doing').length,
    done: allTasks.filter((t) => t.status === 'done').length,
    backlog: allTasks.filter((t) => t.status === 'backlog').length,
  }
})

// Today's tasks grouped by status
const todayTasks = computed(() => {
  const today = selectedDate.value
  return tasks.value.filter((t) => t.planned_date === today)
})

const todayTasksByStatus = computed(() => {
  const today = todayTasks.value
  return {
    today: today.filter((t) => t.status === 'today'),
    doing: today.filter((t) => t.status === 'doing'),
    done: today.filter((t) => t.status === 'done'),
  }
})

const todayMits = computed(() => {
  return todayTasks.value.filter((t) => t.is_mit)
})

// Tasks by theme
const tasksByTheme = computed(() => {
  const themeMap = new Map<string, Task[]>()
  tasks.value.forEach((task) => {
    const theme = task.theme || 'No Theme'
    if (!themeMap.has(theme)) {
      themeMap.set(theme, [])
    }
    themeMap.get(theme)!.push(task)
  })
  return Array.from(themeMap.entries())
    .map(([theme, tasks]) => ({ theme, count: tasks.length, tasks }))
    .sort((a, b) => b.count - a.count)
})

const loadData = async () => {
  isLoading.value = true
  try {
    const [allTasks, themes] = await Promise.all([fetchTasks(), fetchThemes()])
    tasks.value = allTasks
    availableThemes.value = themes
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(selectedDate, () => {
  loadData()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Planner Dashboard</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">Overview of your tasks and progress</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            v-model="selectedDate"
            type="date"
            class="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          />
          <NuxtLink
            to="/dev/planner/daily"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Daily View
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
      ></div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- Statistics Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div
          class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ stats.total }}</div>
          <div class="text-sm text-blue-600 dark:text-blue-400">Total Tasks</div>
        </div>
        <div
          class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-green-700 dark:text-green-300">{{ stats.today }}</div>
          <div class="text-sm text-green-600 dark:text-green-400">Today</div>
        </div>
        <div
          class="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {{ stats.mits }}
          </div>
          <div class="text-sm text-purple-600 dark:text-purple-400">Total MITs</div>
        </div>
        <div
          class="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {{ stats.todayMits }}
          </div>
          <div class="text-sm text-orange-600 dark:text-orange-400">Today MITs</div>
        </div>
        <div
          class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
            {{ stats.doing }}
          </div>
          <div class="text-sm text-yellow-600 dark:text-yellow-400">In Progress</div>
        </div>
        <div
          class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-gray-700 dark:text-gray-300">{{ stats.done }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">Done</div>
        </div>
        <div
          class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-red-700 dark:text-red-300">{{ stats.backlog }}</div>
          <div class="text-sm text-red-600 dark:text-red-400">Backlog</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Today's MITs -->
        <div class="lg:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                Today's MITs (Most Important Tasks)
              </h2>
              <NuxtLink
                to="/dev/planner/daily"
                class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All →
              </NuxtLink>
            </div>
            <div
              v-if="todayMits.length === 0"
              class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Icon name="mdi:check-circle-outline" size="48" class="mx-auto mb-2 opacity-50" />
              <p>No MITs for today</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="mit in todayMits"
                :key="mit.id"
                class="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg"
              >
                <Icon
                  name="mdi:star"
                  size="20"
                  class="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-gray-100">{{ mit.title }}</div>
                  <div v-if="mit.theme" class="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {{ mit.theme }}
                  </div>
                </div>
                <span
                  :class="[
                    'text-xs px-2 py-1 rounded',
                    mit.status === 'done'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : mit.status === 'doing'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                  ]"
                >
                  {{ mit.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div class="space-y-2">
            <NuxtLink
              to="/dev/planner/daily"
              class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
            >
              <Icon name="mdi:calendar-today" size="24" class="text-blue-600 dark:text-blue-400" />
              <span class="text-gray-900 dark:text-gray-100">Daily Planner</span>
            </NuxtLink>
            <NuxtLink
              to="/dev/planner/backlog"
              class="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            >
              <Icon
                name="mdi:format-list-bulleted"
                size="24"
                class="text-red-600 dark:text-red-400"
              />
              <span class="text-gray-900 dark:text-gray-100">Backlog</span>
            </NuxtLink>
            <NuxtLink
              to="/dev/planner/review"
              class="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 rounded-lg transition-colors"
            >
              <Icon name="mdi:chart-line" size="24" class="text-purple-600 dark:text-purple-400" />
              <span class="text-gray-900 dark:text-gray-100">Weekly Review</span>
            </NuxtLink>
            <NuxtLink
              :to="`/dev/planner/print/today?date=${selectedDate}`"
              target="_blank"
              class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 rounded-lg transition-colors"
            >
              <Icon name="mdi:printer" size="24" class="text-green-600 dark:text-green-400" />
              <span class="text-gray-900 dark:text-gray-100">Print Daily Plan</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Today's Tasks by Status -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Today ({{ todayTasksByStatus.today.length }})
          </h3>
          <div
            v-if="todayTasksByStatus.today.length === 0"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            No tasks
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in todayTasksByStatus.today.slice(0, 5)"
              :key="task.id"
              class="text-sm text-gray-700 dark:text-gray-300 p-2 bg-blue-50 dark:bg-blue-950/20 rounded"
            >
              {{ task.title }}
            </div>
            <NuxtLink
              v-if="todayTasksByStatus.today.length > 5"
              to="/dev/planner/daily"
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline block mt-2"
            >
              View {{ todayTasksByStatus.today.length - 5 }} more →
            </NuxtLink>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Doing ({{ todayTasksByStatus.doing.length }})
          </h3>
          <div
            v-if="todayTasksByStatus.doing.length === 0"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            No tasks
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in todayTasksByStatus.doing.slice(0, 5)"
              :key="task.id"
              class="text-sm text-gray-700 dark:text-gray-300 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded"
            >
              {{ task.title }}
            </div>
            <NuxtLink
              v-if="todayTasksByStatus.doing.length > 5"
              to="/dev/planner/daily"
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline block mt-2"
            >
              View {{ todayTasksByStatus.doing.length - 5 }} more →
            </NuxtLink>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Done ({{ todayTasksByStatus.done.length }})
          </h3>
          <div
            v-if="todayTasksByStatus.done.length === 0"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            No tasks
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in todayTasksByStatus.done.slice(0, 5)"
              :key="task.id"
              class="text-sm text-gray-600 dark:text-gray-400 p-2 bg-green-50 dark:bg-green-950/20 rounded line-through"
            >
              {{ task.title }}
            </div>
            <NuxtLink
              v-if="todayTasksByStatus.done.length > 5"
              to="/dev/planner/daily"
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline block mt-2"
            >
              View {{ todayTasksByStatus.done.length - 5 }} more →
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Tasks by Theme -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Tasks by Theme</h2>
        <div
          v-if="tasksByTheme.length === 0"
          class="text-center py-8 text-gray-500 dark:text-gray-400"
        >
          No tasks with themes
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="item in tasksByTheme"
            :key="item.theme"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ item.theme }}</h3>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ item.count }} tasks</span>
            </div>
            <div class="space-y-1">
              <div
                v-for="task in item.tasks.slice(0, 3)"
                :key="task.id"
                class="text-sm text-gray-600 dark:text-gray-400 truncate"
              >
                {{ task.title }}
              </div>
              <div v-if="item.tasks.length > 3" class="text-xs text-gray-500 dark:text-gray-400">
                +{{ item.tasks.length - 3 }} more
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
