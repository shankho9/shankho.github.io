<script setup lang="ts">
import { onUnmounted } from 'vue'
import type { Task } from '~/server/api/planner/tasks.get'
import type { ArchiveStats } from '~/server/api/planner/archive-stats.get'
import { getLocalDateString, formatDateToDisplay } from '~/utils/common/dateParser'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { fetchTasks, deleteTask } = useTasks()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase || '/api'

const isLoading = ref(false)
const isLoadingArchive = ref(false)
const doneTasks = ref<Task[]>([])
const selectedTasks = ref<number[]>([])
const archiveStats = ref<ArchiveStats | null>(null)
const activeTab = ref<'current' | 'archive'>('current')

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

const loadArchiveStats = async () => {
  isLoadingArchive.value = true
  try {
    const stats = await $fetch<ArchiveStats>(`${apiBase}/planner/archive-stats`)
    archiveStats.value = stats
    console.log('[Review] Archive stats loaded successfully:', {
      total: stats.totalArchived,
      mits: stats.totalArchivedMits,
      themes: stats.archivedByTheme.length,
    })
  } catch (error) {
    console.error('[Review] Failed to load archive stats:', error)
    // Set empty stats structure if API fails (e.g., table doesn't exist yet)
    archiveStats.value = {
      totalArchived: 0,
      totalArchivedMits: 0,
      totalArchivedRegular: 0,
      archivedByTheme: [],
      archivedByPeriod: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        last3Months: 0,
        last6Months: 0,
        lastYear: 0,
      },
      dailyTrend: [],
      weeklyTrend: [],
      monthlyTrend: [],
      themeTrend: [],
    }
    console.log('[Review] Set empty archive stats as fallback')
  } finally {
    isLoadingArchive.value = false
  }
}

// Computed properties for archive insights
const archiveMetrics = computed(() => {
  if (!archiveStats.value) {
    // Return default empty metrics
    return {
      total: 0,
      mits: 0,
      regular: 0,
      thisMonth: 0,
      lastMonth: 0,
      thisWeek: 0,
      last3Months: 0,
      last6Months: 0,
      lastYear: 0,
      completionRate: 0,
      topThemes: [],
    }
  }

  const stats = archiveStats.value
  const completionRate =
    stats.archivedByPeriod.lastMonth > 0
      ? (
          ((stats.archivedByPeriod.thisMonth - stats.archivedByPeriod.lastMonth) /
            stats.archivedByPeriod.lastMonth) *
          100
        ).toFixed(1)
      : '0'

  return {
    total: stats.totalArchived,
    mits: stats.totalArchivedMits,
    regular: stats.totalArchivedRegular,
    thisMonth: stats.archivedByPeriod.thisMonth,
    lastMonth: stats.archivedByPeriod.lastMonth,
    thisWeek: stats.archivedByPeriod.thisWeek,
    last3Months: stats.archivedByPeriod.last3Months,
    last6Months: stats.archivedByPeriod.last6Months,
    lastYear: stats.archivedByPeriod.lastYear,
    completionRate: parseFloat(completionRate),
    topThemes: stats.archivedByTheme.slice(0, 5),
  }
})

const maxDailyCount = computed(() => {
  if (!archiveStats.value?.dailyTrend.length) return 1
  return Math.max(...archiveStats.value.dailyTrend.map((d) => d.count), 1)
})

const maxWeeklyCount = computed(() => {
  if (!archiveStats.value?.weeklyTrend.length) return 1
  return Math.max(...archiveStats.value.weeklyTrend.map((w) => w.count), 1)
})

const maxMonthlyCount = computed(() => {
  if (!archiveStats.value?.monthlyTrend.length) return 1
  return Math.max(...archiveStats.value.monthlyTrend.map((m) => m.count), 1)
})

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this task?')) return

  try {
    // Archive the task since it's a completed task on the review page
    // This preserves it for statistics and historical tracking
    await deleteTask(id, true) // archive = true
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
    // Archive all tasks since they're completed tasks on the review page
    // This preserves them for statistics and historical tracking
    await Promise.all(selectedTasks.value.map((id) => deleteTask(id, true))) // archive = true
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

// Menu and dropdown state
const showMobileMenu = ref(false)
const showExportMenu = ref(false)

const handlePrintReport = () => {
  showExportMenu.value = false
  showMobileMenu.value = false
  navigateTo(`/dev/planner/print/today?date=${getLocalDateString()}`)
}

// Set up event listeners and cleanup at top level
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.menu-container')) {
    showMobileMenu.value = false
    showExportMenu.value = false
  }
}

onMounted(() => {
  loadDoneTasks()
  loadArchiveStats()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Review & Insights
        </h1>
        <!-- Desktop: Large buttons with labels -->
        <div class="hidden sm:flex items-center gap-2 flex-wrap">
          <NuxtLink
            to="/dev/planner"
            class="px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center gap-2"
          >
            <Icon name="mdi:view-dashboard" size="20" />
            <span>Dashboard</span>
          </NuxtLink>
          <NuxtLink
            to="/dev/planner/tasks"
            class="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation flex items-center justify-center gap-2"
          >
            <Icon name="mdi:format-list-checkbox" size="20" />
            <span>Manage Tasks</span>
          </NuxtLink>
          <div class="relative menu-container">
            <button
              class="px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors touch-manipulation flex items-center justify-center gap-2"
              @click.stop="showExportMenu = !showExportMenu"
            >
              <Icon name="mdi:file-export" size="20" />
              <span>Export/Print</span>
              <Icon name="mdi:chevron-down" size="16" />
            </button>
            <!-- Export/Print Dropdown -->
            <div
              v-if="showExportMenu"
              class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
              @click.stop
            >
              <button
                class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                @click="handlePrintReport"
              >
                <Icon name="mdi:printer" size="20" />
                <span>Print Summary</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile: Hamburger Menu -->
        <div class="sm:hidden relative menu-container">
          <button
            class="p-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            @click.stop="showMobileMenu = !showMobileMenu"
          >
            <Icon name="mdi:menu" size="24" />
          </button>
          <!-- Mobile Menu Backdrop -->
          <div
            v-if="showMobileMenu"
            class="fixed inset-0 bg-black/20 z-40 sm:hidden"
            @click="showMobileMenu = false"
          ></div>
          <!-- Mobile Menu Dropdown -->
          <div
            v-if="showMobileMenu"
            class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
            @click.stop
          >
            <NuxtLink
              to="/dev/planner"
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="showMobileMenu = false"
            >
              <Icon name="mdi:view-dashboard" size="20" />
              <span>Dashboard</span>
            </NuxtLink>
            <NuxtLink
              to="/dev/planner/tasks"
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="showMobileMenu = false"
            >
              <Icon name="mdi:format-list-checkbox" size="20" />
              <span>Manage Tasks</span>
            </NuxtLink>
            <button
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm"
              @click="handlePrintReport"
            >
              <Icon name="mdi:printer" size="20" />
              <span>Print Summary</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
      <button
        :class="[
          'px-4 py-2 font-medium transition-colors border-b-2',
          activeTab === 'current'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="activeTab = 'current'"
      >
        Current Done Tasks
      </button>
      <button
        :class="[
          'px-4 py-2 font-medium transition-colors border-b-2',
          activeTab === 'archive'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="activeTab = 'archive'"
      >
        Archive Stats & Insights
      </button>
    </div>

    <!-- Archive Stats Tab -->
    <div v-if="activeTab === 'archive'">
      <div v-if="isLoadingArchive" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
        ></div>
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading archive statistics...</p>
      </div>

      <div v-else-if="archiveStats">
        <!-- Archive Overview Metrics -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div
            class="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {{ archiveMetrics.total }}
            </div>
            <div class="text-sm text-indigo-600 dark:text-indigo-400">Total Archived</div>
          </div>
          <div
            class="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {{ archiveMetrics.mits }}
            </div>
            <div class="text-sm text-purple-600 dark:text-purple-400">Archived MITs</div>
          </div>
          <div
            class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {{ archiveMetrics.regular }}
            </div>
            <div class="text-sm text-blue-600 dark:text-blue-400">Regular Tasks</div>
          </div>
          <div
            class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-green-700 dark:text-green-300">
              {{ archiveMetrics.thisWeek }}
            </div>
            <div class="text-sm text-green-600 dark:text-green-400">This Week</div>
          </div>
          <div
            class="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {{ archiveMetrics.thisMonth }}
            </div>
            <div class="text-sm text-orange-600 dark:text-orange-400">This Month</div>
          </div>
          <div
            class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {{ archiveMetrics.last3Months }}
            </div>
            <div class="text-sm text-yellow-600 dark:text-yellow-400">Last 3 Months</div>
          </div>
          <div
            class="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4"
          >
            <div class="text-2xl font-bold text-teal-700 dark:text-teal-300">
              {{ archiveMetrics.lastYear }}
            </div>
            <div class="text-sm text-teal-600 dark:text-teal-400">Last Year</div>
          </div>
        </div>

        <!-- Completion Rate Insight -->
        <div
          v-if="archiveMetrics && archiveMetrics.lastMonth > 0"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Completion Trend</h2>
          <div class="flex items-center gap-4">
            <div class="flex-1">
              <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Month-over-Month Change
              </div>
              <div
                :class="[
                  'text-3xl font-bold',
                  archiveMetrics.completionRate >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400',
                ]"
              >
                {{ archiveMetrics.completionRate >= 0 ? '+' : ''
                }}{{ archiveMetrics.completionRate }}%
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600 dark:text-gray-400">This Month</div>
              <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ archiveMetrics.thisMonth }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs {{ archiveMetrics.lastMonth }} last month
              </div>
            </div>
          </div>
        </div>

        <!-- Daily Trend Chart -->
        <div
          v-if="archiveStats?.dailyTrend.length"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Daily Completion Trend (Last 30 Days)
          </h2>
          <div class="space-y-2">
            <div
              v-for="day in archiveStats.dailyTrend.slice().reverse()"
              :key="day.date"
              class="flex items-center gap-3"
            >
              <div class="w-24 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                {{ formatDateToDisplay(day.date) || day.date }}
              </div>
              <div class="flex-1 flex items-center gap-2">
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                  <div
                    class="bg-blue-500 dark:bg-blue-400 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                    :style="{ width: `${(day.count / maxDailyCount) * 100}%` }"
                  >
                    <span
                      v-if="day.count > 0"
                      class="text-xs font-medium text-white dark:text-gray-900"
                    >
                      {{ day.count }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="day.mits > 0"
                  class="text-xs text-purple-600 dark:text-purple-400 font-medium w-12 text-right"
                >
                  {{ day.mits }} MIT
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly Trend Chart -->
        <div
          v-if="archiveStats?.weeklyTrend.length"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Weekly Completion Trend (Last 12 Weeks)
          </h2>
          <div class="space-y-2">
            <div
              v-for="week in archiveStats.weeklyTrend.slice().reverse()"
              :key="week.week"
              class="flex items-center gap-3"
            >
              <div class="w-24 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                Week of {{ formatDateToDisplay(week.week) || week.week }}
              </div>
              <div class="flex-1 flex items-center gap-2">
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                  <div
                    class="bg-green-500 dark:bg-green-400 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                    :style="{ width: `${(week.count / maxWeeklyCount) * 100}%` }"
                  >
                    <span
                      v-if="week.count > 0"
                      class="text-xs font-medium text-white dark:text-gray-900"
                    >
                      {{ week.count }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="week.mits > 0"
                  class="text-xs text-purple-600 dark:text-purple-400 font-medium w-12 text-right"
                >
                  {{ week.mits }} MIT
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Trend Chart -->
        <div
          v-if="archiveStats?.monthlyTrend.length"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Monthly Completion Trend (Last 12 Months)
          </h2>
          <div class="space-y-2">
            <div
              v-for="month in archiveStats.monthlyTrend.slice().reverse()"
              :key="month.month"
              class="flex items-center gap-3"
            >
              <div class="w-32 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                {{ month.month }}
              </div>
              <div class="flex-1 flex items-center gap-2">
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative">
                  <div
                    class="bg-purple-500 dark:bg-purple-400 h-8 rounded-full flex items-center justify-end pr-2 transition-all"
                    :style="{ width: `${(month.count / maxMonthlyCount) * 100}%` }"
                  >
                    <span
                      v-if="month.count > 0"
                      class="text-sm font-medium text-white dark:text-gray-900"
                    >
                      {{ month.count }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="month.mits > 0"
                  class="text-xs text-purple-600 dark:text-purple-400 font-medium w-12 text-right"
                >
                  {{ month.mits }} MIT
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Themes Over Time -->
        <div
          v-if="
            archiveStats && archiveStats.archivedByTheme && archiveStats.archivedByTheme.length > 0
          "
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Top Archived Themes
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div
              v-for="item in archiveMetrics.topThemes"
              :key="item.theme || 'none'"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {{ item.theme || 'No Bucket' }}
                </h3>
                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{
                  item.count
                }}</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                  :style="{ width: `${(item.count / archiveMetrics.total) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-12">
        <Icon
          name="mdi:archive-outline"
          size="64"
          class="mx-auto mb-4 text-gray-400 dark:text-gray-600"
        />
        <p class="text-lg text-gray-500 dark:text-gray-400">No archive data available yet</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-2 mb-4">
          Archive tasks by using "Close and Archive" when deleting tasks
        </p>
        <div
          v-if="archiveStats && archiveStats.totalArchived === 0"
          class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 max-w-md mx-auto"
        >
          <p class="font-semibold mb-1">Note:</p>
          <p>
            If you've archived tasks but see no data, ensure the database migration has been run:
            <code class="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">
              node scripts/migrations/run-task-archival-migration.js
            </code>
          </p>
        </div>
      </div>
    </div>

    <!-- Current Done Tasks Tab -->
    <div v-if="activeTab === 'current'">
      <!-- Key Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div
          class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div class="text-2xl font-bold text-green-700 dark:text-green-300">
            {{ metrics.total }}
          </div>
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
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {{ metrics.regular }}
          </div>
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
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Top Completed Themes
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div
            v-for="item in tasksByTheme"
            :key="item.theme"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ item.theme }}
              </h3>
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
              <div
                v-if="task.theme"
                class="text-sm sm:text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
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
  </div>
</template>
