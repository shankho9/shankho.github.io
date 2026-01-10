<script setup lang="ts">
import { onUnmounted, onMounted } from 'vue'
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
const allTasks = ref<Task[]>([])
const selectedTasks = ref<number[]>([])
const archiveStats = ref<ArchiveStats | null>(null)

// ========== OPEN TASKS METRICS ==========

const openTasks = computed(() => {
  return allTasks.value.filter((task) => task.status !== 'done')
})

const openTasksMetrics = computed(() => {
  const open = openTasks.value
  const total = open.length

  // Open tasks by MIT status
  const withMits = open.filter((t) => t.is_mit).length
  const withoutMits = total - withMits

  // Open tasks by bucket
  const byBucket = new Map<string, number>()
  open.forEach((task) => {
    const bucket = task.theme || 'No Bucket'
    byBucket.set(bucket, (byBucket.get(bucket) || 0) + 1)
  })
  const byBucketArray = Array.from(byBucket.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => b.count - a.count)

  // Open task aging (days since creation)
  const now = new Date()
  const aging = {
    '0-7': 0,
    '8-14': 0,
    '15-30': 0,
    '31-60': 0,
    '60+': 0,
  }

  open.forEach((task) => {
    if (!task.created_at) return
    const created = new Date(task.created_at)
    const daysOpen = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOpen <= 7) aging['0-7']++
    else if (daysOpen <= 14) aging['8-14']++
    else if (daysOpen <= 30) aging['15-30']++
    else if (daysOpen <= 60) aging['31-60']++
    else aging['60+']++
  })

  // Open tasks by priority
  const byPriority = {
    high: open.filter((t) => t.priority === 'high').length,
    medium: open.filter((t) => t.priority === 'medium').length,
    low: open.filter((t) => t.priority === 'low').length,
  }

  return {
    total,
    withMits,
    withoutMits,
    byBucket: byBucketArray,
    aging,
    byPriority,
  }
})

// ========== CLOSED TASKS METRICS ==========

const closedTasks = computed(() => {
  return allTasks.value.filter((task) => task.status === 'done')
})

const closedTasksMetrics = computed(() => {
  const closed = closedTasks.value
  const archived = archiveStats.value || {
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

  // Total closed (current + archived)
  const totalClosed = closed.length + archived.totalArchived

  // Closed with MITs vs regular
  const currentMits = closed.filter((t) => t.is_mit).length
  const totalMits = currentMits + archived.totalArchivedMits
  const totalRegular = totalClosed - totalMits

  // Trends - combine archived and recently closed tasks for all periods
  // Use midnight boundaries to match SQL CURRENT_DATE behavior
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const weekAgo = new Date(todayMidnight)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(todayMidnight)
  monthAgo.setDate(monthAgo.getDate() - 30)
  const threeMonthsAgo = new Date(todayMidnight)
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90)
  const sixMonthsAgo = new Date(todayMidnight)
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180)

  const trends = {
    thisWeek:
      archived.archivedByPeriod.thisWeek +
      closed.filter((task) => {
        if (!task.updated_at) return false
        const taskDate = new Date(task.updated_at)
        return taskDate >= weekAgo
      }).length,
    thisMonth:
      archived.archivedByPeriod.thisMonth +
      closed.filter((task) => {
        if (!task.updated_at) return false
        const taskDate = new Date(task.updated_at)
        return taskDate >= monthAgo
      }).length,
    last3Months:
      archived.archivedByPeriod.last3Months +
      closed.filter((task) => {
        if (!task.updated_at) return false
        const taskDate = new Date(task.updated_at)
        return taskDate >= threeMonthsAgo
      }).length,
    last6Months:
      archived.archivedByPeriod.last6Months +
      closed.filter((task) => {
        if (!task.updated_at) return false
        const taskDate = new Date(task.updated_at)
        return taskDate >= sixMonthsAgo
      }).length,
  }

  // Closed by bucket (current + archived)
  // Calculate total tasks per bucket first (all current tasks + archived tasks)
  const totalByBucket = new Map<string, number>()

  // Count all current tasks (open + closed) by bucket
  allTasks.value.forEach((task) => {
    const bucket = task.theme || 'No Bucket'
    totalByBucket.set(bucket, (totalByBucket.get(bucket) || 0) + 1)
  })

  // Count archived tasks by bucket and add to total
  archived.archivedByTheme.forEach((item) => {
    const bucket = item.theme || 'No Bucket'
    totalByBucket.set(bucket, (totalByBucket.get(bucket) || 0) + item.count)
  })

  // Count closed tasks by bucket (current closed + archived)
  const closedByBucket = new Map<string, number>()

  // Add current closed tasks
  closed.forEach((task) => {
    const bucket = task.theme || 'No Bucket'
    closedByBucket.set(bucket, (closedByBucket.get(bucket) || 0) + 1)
  })

  // Add archived tasks (all archived tasks are closed)
  archived.archivedByTheme.forEach((item) => {
    const bucket = item.theme || 'No Bucket'
    closedByBucket.set(bucket, (closedByBucket.get(bucket) || 0) + item.count)
  })

  // Combine into array with percentages
  const closedByBucketArray = Array.from(totalByBucket.entries())
    .map(([bucket, total]) => {
      const closedCount = closedByBucket.get(bucket) || 0
      return {
        bucket,
        closed: closedCount,
        total,
        percentage: total > 0 ? Math.round((closedCount / total) * 100) : 0,
      }
    })
    .filter((item) => item.closed > 0) // Only show buckets with closed tasks
    .sort((a, b) => b.closed - a.closed)

  // Average time to close (for tasks that have both created_at and updated_at)
  let totalDaysToClose = 0
  let tasksWithTimeData = 0

  closed.forEach((task) => {
    if (task.created_at && task.updated_at) {
      const created = new Date(task.created_at)
      const updated = new Date(task.updated_at)
      const days = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) {
        totalDaysToClose += days
        tasksWithTimeData++
      }
    }
  })

  const avgDaysToClose =
    tasksWithTimeData > 0 ? Math.round(totalDaysToClose / tasksWithTimeData) : 0

  return {
    totalClosed,
    totalMits,
    totalRegular,
    trends,
    closedByBucket: closedByBucketArray,
    avgDaysToClose,
  }
})

// ========== CHART DATA (for completion trends) ==========

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

const formatWeekLabel = (weekStr: string): string => {
  // Format: "2024-W01" -> "Jan 15"
  const match = weekStr.match(/(\d{4})-W(\d{2})/)
  if (!match) return weekStr

  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // Calculate first day of week (Monday)
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay() || 7 // Convert Sunday (0) to 7
  const daysToMonday = (jan4Day - 1) % 7
  const firstMonday = new Date(jan4)
  firstMonday.setDate(jan4.getDate() - daysToMonday)

  const weekStart = new Date(firstMonday)
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7)

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`
}

const dailyBarChartData = computed(() => {
  if (!archiveStats.value?.dailyTrend.length) return []
  const days = archiveStats.value.dailyTrend.slice().reverse()
  const maxCount = maxDailyCount.value || 1
  const chartWidth = 320
  const chartHeight = 160
  const startX = 50
  const startY = 30
  const spacing = Math.max(2, Math.min(8, chartWidth / (days.length * 3)))
  const availableWidth = chartWidth - spacing * (days.length - 1)
  const barWidth = Math.max(3, availableWidth / days.length)

  return days.map((day, index) => {
    const x = startX + index * (barWidth + spacing)
    const height = ((day.count || 0) / maxCount) * chartHeight
    const y = startY + chartHeight - height

    return {
      x,
      y,
      width: barWidth,
      height,
      count: day.count,
      date: formatDateToDisplay(day.date) || day.date,
      mits: day.mits,
      centerX: x + barWidth / 2,
    }
  })
})

const weeklyBarChartData = computed(() => {
  if (!archiveStats.value?.weeklyTrend.length) return []
  const weeks = archiveStats.value.weeklyTrend.slice().reverse()
  const maxCount = maxWeeklyCount.value || 1
  const chartWidth = 320
  const chartHeight = 160
  const startX = 50
  const startY = 30
  const spacing = Math.max(2, Math.min(8, chartWidth / (weeks.length * 3)))
  const availableWidth = chartWidth - spacing * (weeks.length - 1)
  const barWidth = Math.max(3, availableWidth / weeks.length)

  return weeks.map((week, index) => {
    const x = startX + index * (barWidth + spacing)
    const height = ((week.count || 0) / maxCount) * chartHeight
    const y = startY + chartHeight - height

    return {
      x,
      y,
      width: barWidth,
      height,
      count: week.count,
      label: formatWeekLabel(week.week),
      mits: week.mits,
      centerX: x + barWidth / 2,
    }
  })
})

const monthlyBarChartData = computed(() => {
  if (!archiveStats.value?.monthlyTrend.length) return []
  const months = archiveStats.value.monthlyTrend.slice().reverse()
  const maxCount = maxMonthlyCount.value || 1
  const chartWidth = 320
  const chartHeight = 160
  const startX = 50
  const startY = 30
  const spacing = Math.max(2, Math.min(8, chartWidth / (months.length * 3)))
  const availableWidth = chartWidth - spacing * (months.length - 1)
  const barWidth = Math.max(3, availableWidth / months.length)

  return months.map((month, index) => {
    const x = startX + index * (barWidth + spacing)
    const height = ((month.count || 0) / maxCount) * chartHeight
    const y = startY + chartHeight - height

    return {
      x,
      y,
      width: barWidth,
      height,
      count: month.count,
      label: month.month,
      mits: month.mits,
      centerX: x + barWidth / 2,
    }
  })
})

// Modal chart data
const selectedChart = ref<'daily' | 'weekly' | 'monthly' | null>(null)

const modalDailyBarChartData = computed(() => {
  if (!archiveStats.value?.dailyTrend.length) return []
  const days = archiveStats.value.dailyTrend.slice().reverse()
  const maxCount = maxDailyCount.value || 1
  const chartWidth = 700
  const chartHeight = 320
  const startX = 60
  const startY = 40
  const spacing = Math.max(3, Math.min(10, chartWidth / (days.length * 2)))
  const availableWidth = chartWidth - spacing * (days.length - 1)
  const barWidth = Math.max(4, availableWidth / days.length)

  return days.map((day, index) => {
    const x = startX + index * (barWidth + spacing)
    const height = ((day.count || 0) / maxCount) * chartHeight
    const y = startY + chartHeight - height

    return {
      x,
      y,
      width: barWidth,
      height,
      count: day.count,
      date: formatDateToDisplay(day.date) || day.date,
      mits: day.mits,
      centerX: x + barWidth / 2,
    }
  })
})

const modalWeeklyBarChartData = computed(() => {
  if (!archiveStats.value?.weeklyTrend.length) return []
  const weeks = archiveStats.value.weeklyTrend.slice().reverse()
  const maxCount = maxWeeklyCount.value || 1
  const chartWidth = 700
  const chartHeight = 320
  const startX = 60
  const startY = 40
  const spacing = Math.max(4, Math.min(12, chartWidth / (weeks.length * 2)))
  const availableWidth = chartWidth - spacing * (weeks.length - 1)
  const barWidth = Math.max(5, availableWidth / weeks.length)

  return weeks.map((week, index) => {
    const x = startX + index * (barWidth + spacing)
    const height = ((week.count || 0) / maxCount) * chartHeight
    const y = startY + chartHeight - height

    return {
      x,
      y,
      width: barWidth,
      height,
      count: week.count,
      label: formatWeekLabel(week.week),
      mits: week.mits,
      centerX: x + barWidth / 2,
    }
  })
})

const modalMonthlyBarChartData = computed(() => {
  if (!archiveStats.value?.monthlyTrend.length) return []
  const months = archiveStats.value.monthlyTrend.slice().reverse()
  const maxCount = maxMonthlyCount.value || 1
  const chartWidth = 700
  const chartHeight = 320
  const startX = 60
  const startY = 40
  const spacing = Math.max(4, Math.min(12, chartWidth / (months.length * 2)))
  const availableWidth = chartWidth - spacing * (months.length - 1)
  const barWidth = Math.max(8, availableWidth / months.length)

  return months.map((month, index) => {
    const x = startX + index * (barWidth + spacing)
    const height = ((month.count || 0) / maxCount) * chartHeight
    const y = startY + chartHeight - height

    return {
      x,
      y,
      width: barWidth,
      height,
      count: month.count,
      label: month.month,
      mits: month.mits,
      centerX: x + barWidth / 2,
    }
  })
})

// ========== DATA LOADING ==========

const loadTasks = async () => {
  isLoading.value = true
  try {
    const fetchedTasks = await fetchTasks()
    allTasks.value = fetchedTasks
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    isLoading.value = false
  }
}

const loadArchiveStats = async () => {
  isLoadingArchive.value = true
  try {
    const stats = await $fetch<ArchiveStats>(`${apiBase}/planner/archive-stats`)
    archiveStats.value = stats
  } catch (error) {
    console.error('Failed to load archive stats:', error)
  } finally {
    isLoadingArchive.value = false
  }
}

// ========== DELETE FUNCTIONALITY ==========

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this task?')) return
  try {
    await deleteTask(id, true) // archive=true for archival record
    allTasks.value = allTasks.value.filter((t) => t.id !== id)
    await loadArchiveStats() // Reload archive stats to reflect the change
  } catch (error) {
    console.error('Failed to delete task:', error)
    alert('Failed to delete task. Please try again.')
  }
}

const handleBulkDelete = async () => {
  if (selectedTasks.value.length === 0) {
    alert('Please select at least one task to delete.')
    return
  }

  if (!confirm(`Are you sure you want to delete ${selectedTasks.value.length} task(s)?`)) return

  const taskIdsToDelete = [...selectedTasks.value]
  selectedTasks.value = []

  try {
    await Promise.all(taskIdsToDelete.map((id) => deleteTask(id, true)))
    allTasks.value = allTasks.value.filter((t) => !taskIdsToDelete.includes(t.id))
    await loadArchiveStats()
    alert(`Successfully deleted ${taskIdsToDelete.length} task(s).`)
  } catch (error) {
    console.error('Failed to delete tasks:', error)
    alert('Failed to delete some tasks. Please try again.')
  }
}

// ========== CHART MODAL ==========

const openChartModal = (chartType: 'daily' | 'weekly' | 'monthly') => {
  selectedChart.value = chartType
}

const closeChartModal = () => {
  selectedChart.value = null
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && selectedChart.value) {
    closeChartModal()
  }
}

// ========== EXPORT/PRINT ==========

const showExportMenu = ref(false)

const handlePrintReport = () => {
  showExportMenu.value = false
  navigateTo(`/dev/planner/print/today?date=${getLocalDateString()}`)
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.menu-container')) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  loadTasks()
  loadArchiveStats()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl w-full overflow-x-hidden">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Planner Review
        </h1>

        <!-- Desktop: Button Row -->
        <div class="hidden sm:flex items-center gap-3">
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

        <!-- Mobile: Horizontal Button Row -->
        <div class="sm:hidden flex items-center gap-1.5 flex-wrap">
          <NuxtLink
            to="/dev/planner"
            class="px-2.5 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
            style="touch-action: manipulation; min-height: 32px"
          >
            <Icon name="mdi:view-dashboard" size="16" />
            <span>Dashboard</span>
          </NuxtLink>
          <NuxtLink
            to="/dev/planner/tasks"
            class="px-2.5 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
            style="touch-action: manipulation; min-height: 32px"
          >
            <Icon name="mdi:format-list-checkbox" size="16" />
            <span>Tasks</span>
          </NuxtLink>
          <button
            class="px-2.5 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors touch-manipulation flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
            style="touch-action: manipulation; min-height: 32px"
            @click="handlePrintReport"
          >
            <Icon name="mdi:printer" size="16" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading || isLoadingArchive" class="text-center py-8">
      <div class="text-gray-600 dark:text-gray-400">Loading...</div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- ========== OPEN TASKS SECTION ========== -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Open Tasks
        </h2>

        <!-- Overview Stats -->
        <div
          class="flex flex-row flex-nowrap md:grid md:grid-cols-4 justify-around sm:justify-around gap-2 sm:gap-3 md:gap-4 mb-6 overflow-x-auto scrollbar-hide"
          style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
        >
          <div
            class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
          >
            <div class="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300">
              {{ openTasksMetrics.total }}
            </div>
            <div class="text-[10px] sm:text-xs md:text-sm text-blue-600 dark:text-blue-400">
              Total Open
            </div>
          </div>
          <div
            class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
          >
            <div class="text-lg sm:text-xl md:text-2xl font-bold text-red-700 dark:text-red-300">
              {{ openTasksMetrics.withMits }}
            </div>
            <div class="text-[10px] sm:text-xs md:text-sm text-red-600 dark:text-red-400">
              With MITs
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
          >
            <div class="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300">
              {{ openTasksMetrics.withoutMits }}
            </div>
            <div class="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Regular Tasks
            </div>
          </div>
          <div
            class="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
          >
            <div
              class="text-lg sm:text-xl md:text-2xl font-bold text-purple-700 dark:text-purple-300"
            >
              {{ openTasksMetrics.byPriority.high }}
            </div>
            <div class="text-[10px] sm:text-xs md:text-sm text-purple-600 dark:text-purple-400">
              High Priority
            </div>
          </div>
        </div>

        <!-- Task Aging -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Task Aging</h3>
          <div
            class="flex flex-row flex-nowrap md:grid md:grid-cols-5 justify-around sm:justify-around gap-2 sm:gap-3 overflow-x-auto scrollbar-hide"
            style="
              scrollbar-width: none;
              -ms-overflow-style: none;
              -webkit-overflow-scrolling: touch;
            "
          >
            <div
              class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div class="text-base sm:text-lg font-bold text-green-700 dark:text-green-300">
                {{ openTasksMetrics.aging['0-7'] }}
              </div>
              <div class="text-[10px] sm:text-xs text-green-600 dark:text-green-400">0-7 days</div>
            </div>
            <div
              class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 sm:p-3 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div class="text-base sm:text-lg font-bold text-yellow-700 dark:text-yellow-300">
                {{ openTasksMetrics.aging['8-14'] }}
              </div>
              <div class="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400">
                8-14 days
              </div>
            </div>
            <div
              class="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 sm:p-3 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div class="text-base sm:text-lg font-bold text-orange-700 dark:text-orange-300">
                {{ openTasksMetrics.aging['15-30'] }}
              </div>
              <div class="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                15-30 days
              </div>
            </div>
            <div
              class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2 sm:p-3 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div class="text-base sm:text-lg font-bold text-red-700 dark:text-red-300">
                {{ openTasksMetrics.aging['31-60'] }}
              </div>
              <div class="text-[10px] sm:text-xs text-red-600 dark:text-red-400">31-60 days</div>
            </div>
            <div
              class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div class="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300">
                {{ openTasksMetrics.aging['60+'] }}
              </div>
              <div class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">60+ days</div>
            </div>
          </div>
        </div>

        <!-- Open Tasks by Bucket -->
        <div v-if="openTasksMetrics.byBucket.length > 0">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Open Tasks by Bucket
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="item in openTasksMetrics.byBucket"
              :key="item.bucket"
              class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <div class="flex items-center justify-between">
                <div class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {{ item.bucket }}
                </div>
                <div class="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {{ item.count }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== CLOSED TASKS SECTION ========== -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Closed Tasks
        </h2>

        <!-- Closure Trends -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Closure Trends
          </h3>
          <div
            class="flex flex-row flex-nowrap md:grid md:grid-cols-4 justify-around sm:justify-around gap-2 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide"
            style="
              scrollbar-width: none;
              -ms-overflow-style: none;
              -webkit-overflow-scrolling: touch;
            "
          >
            <div
              class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div
                class="text-lg sm:text-xl md:text-2xl font-bold text-green-700 dark:text-green-300"
              >
                {{ closedTasksMetrics.trends.thisWeek }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-green-600 dark:text-green-400">
                This Week
              </div>
            </div>
            <div
              class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div
                class="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300"
              >
                {{ closedTasksMetrics.trends.thisMonth }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-blue-600 dark:text-blue-400">
                This Month
              </div>
            </div>
            <div
              class="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div
                class="text-lg sm:text-xl md:text-2xl font-bold text-purple-700 dark:text-purple-300"
              >
                {{ closedTasksMetrics.trends.last3Months }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-purple-600 dark:text-purple-400">
                Last 3 Months
              </div>
            </div>
            <div
              class="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div
                class="text-lg sm:text-xl md:text-2xl font-bold text-orange-700 dark:text-orange-300"
              >
                {{ closedTasksMetrics.trends.last6Months }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-orange-600 dark:text-orange-400">
                Last 6 Months
              </div>
            </div>
          </div>
        </div>

        <!-- Total Closed Stats -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Total Closed</h3>
          <div
            class="flex flex-row flex-nowrap md:grid md:grid-cols-3 justify-around sm:justify-around gap-2 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide"
            style="
              scrollbar-width: none;
              -ms-overflow-style: none;
              -webkit-overflow-scrolling: touch;
            "
          >
            <div
              class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div
                class="text-lg sm:text-xl md:text-2xl font-bold text-green-700 dark:text-green-300"
              >
                {{ closedTasksMetrics.totalClosed }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-green-600 dark:text-green-400">
                Total Closed
              </div>
            </div>
            <div
              class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div class="text-lg sm:text-xl md:text-2xl font-bold text-red-700 dark:text-red-300">
                {{ closedTasksMetrics.totalMits }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-red-600 dark:text-red-400">
                With MITs
              </div>
            </div>
            <div
              class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 md:p-4 flex-1 min-w-0 text-center flex-shrink-0"
            >
              <div
                class="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300"
              >
                {{ closedTasksMetrics.totalRegular }}
              </div>
              <div class="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Regular Tasks
              </div>
            </div>
          </div>
        </div>

        <!-- Closure Trends by Bucket -->
        <div v-if="closedTasksMetrics.closedByBucket.length > 0" class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Closure Trends by Bucket
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="item in closedTasksMetrics.closedByBucket"
              :key="item.bucket"
              class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {{ item.bucket }}
                </div>
                <div class="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {{ item.closed }}
                </div>
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                {{ item.closed }} of {{ item.total }} tasks ({{ item.percentage }}%)
              </div>
            </div>
          </div>
        </div>

        <!-- Completion Trends & Insights (Charts) -->
        <div v-if="archiveStats" class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Completion Trends & Insights
          </h3>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Daily Trend Bar Chart -->
            <div
              v-if="archiveStats?.dailyTrend.length"
              class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              @click="openChartModal('daily')"
            >
              <h4 class="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Daily (Last 30 Days)
              </h4>
              <svg viewBox="0 0 400 220" class="w-full h-48" preserveAspectRatio="xMidYMid meet">
                <!-- Y-axis -->
                <line
                  x1="50"
                  y1="30"
                  x2="50"
                  y2="190"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:stroke-gray-500"
                />
                <!-- X-axis -->
                <line
                  x1="50"
                  y1="190"
                  x2="370"
                  y2="190"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <!-- Y-axis label -->
                <text
                  x="15"
                  y="110"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  transform="rotate(-90 15 110)"
                  style="font-size: 12px"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  Tasks
                </text>
                <!-- Y-axis ticks and labels -->
                <g v-for="(tick, index) in 4" :key="`daily-y-tick-${index}`">
                  <line
                    x1="48"
                    :y1="30 + (index * 160) / 3"
                    x2="50"
                    :y2="30 + (index * 160) / 3"
                    stroke="rgb(156, 163, 175)"
                    stroke-width="1"
                    class="dark:[stroke:rgb(107,114,128)]"
                  />
                  <text
                    x="45"
                    :y="35 + (index * 160) / 3"
                    fill="rgb(75, 85, 99)"
                    text-anchor="end"
                    dominant-baseline="middle"
                    style="font-size: 11px"
                    class="dark:[fill:rgb(156,163,175)]"
                  >
                    {{ Math.round(maxDailyCount - (maxDailyCount / 3) * index) }}
                  </text>
                </g>
                <!-- Bars -->
                <g v-for="(bar, index) in dailyBarChartData" :key="`daily-bar-${index}`">
                  <rect
                    :x="bar.x"
                    :y="bar.y"
                    :width="bar.width"
                    :height="bar.height"
                    fill="rgb(59, 130, 246)"
                    class="dark:fill-blue-400 cursor-pointer hover:opacity-80 transition-opacity"
                    :title="`${bar.date}: ${bar.count} tasks${bar.mits > 0 ? ` (${bar.mits} MITs)` : ''}`"
                  />
                  <!-- Data label on top of bar -->
                  <text
                    v-if="bar.count > 0"
                    :x="bar.centerX"
                    :y="bar.y - 5"
                    fill="rgb(75, 85, 99)"
                    text-anchor="middle"
                    dominant-baseline="bottom"
                    style="font-size: 11px; font-weight: 500"
                    class="dark:[fill:rgb(209,213,219)]"
                  >
                    {{ bar.count }}
                  </text>
                </g>
                <!-- X-axis tick marks and labels -->
                <g v-for="(bar, index) in dailyBarChartData" :key="`daily-x-tick-${index}`">
                  <line
                    :x1="bar.centerX"
                    y1="190"
                    :x2="bar.centerX"
                    y2="193"
                    stroke="rgb(156, 163, 175)"
                    stroke-width="1"
                    class="dark:[stroke:rgb(107,114,128)]"
                  />
                  <text
                    v-if="
                      index % Math.ceil(dailyBarChartData.length / 6) === 0 ||
                      index === dailyBarChartData.length - 1
                    "
                    :x="bar.centerX"
                    y="212"
                    fill="rgb(75, 85, 99)"
                    text-anchor="middle"
                    style="font-size: 11px; font-weight: 500"
                    class="dark:[fill:rgb(156,163,175)]"
                  >
                    {{ bar.date }}
                  </text>
                </g>
              </svg>
            </div>

            <!-- Weekly Trend Bar Chart -->
            <div
              v-if="archiveStats?.weeklyTrend.length"
              class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              @click="openChartModal('weekly')"
            >
              <h4 class="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Weekly (Last 12 Weeks)
              </h4>
              <svg viewBox="0 0 400 220" class="w-full h-48" preserveAspectRatio="xMidYMid meet">
                <!-- Y-axis -->
                <line
                  x1="50"
                  y1="30"
                  x2="50"
                  y2="190"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:stroke-gray-500"
                />
                <!-- X-axis -->
                <line
                  x1="50"
                  y1="190"
                  x2="370"
                  y2="190"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <!-- Y-axis label -->
                <text
                  x="15"
                  y="110"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  transform="rotate(-90 15 110)"
                  style="font-size: 12px"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  Tasks
                </text>
                <!-- Y-axis ticks and labels -->
                <g v-for="(tick, index) in 4" :key="`weekly-y-tick-${index}`">
                  <line
                    x1="48"
                    :y1="30 + (index * 160) / 3"
                    x2="50"
                    :y2="30 + (index * 160) / 3"
                    stroke="rgb(156, 163, 175)"
                    stroke-width="1"
                    class="dark:[stroke:rgb(107,114,128)]"
                  />
                  <text
                    x="45"
                    :y="35 + (index * 160) / 3"
                    fill="rgb(75, 85, 99)"
                    text-anchor="end"
                    dominant-baseline="middle"
                    style="font-size: 11px"
                    class="dark:[fill:rgb(156,163,175)]"
                  >
                    {{ Math.round(maxWeeklyCount - (maxWeeklyCount / 3) * index) }}
                  </text>
                </g>
                <!-- Bars -->
                <g v-for="(bar, index) in weeklyBarChartData" :key="`weekly-bar-${index}`">
                  <rect
                    :x="bar.x"
                    :y="bar.y"
                    :width="bar.width"
                    :height="bar.height"
                    fill="rgb(34, 197, 94)"
                    class="dark:fill-green-400 cursor-pointer hover:opacity-80 transition-opacity"
                    :title="`${bar.label}: ${bar.count} tasks${bar.mits > 0 ? ` (${bar.mits} MITs)` : ''}`"
                  />
                  <!-- Data label on top of bar -->
                  <text
                    v-if="bar.count > 0"
                    :x="bar.centerX"
                    :y="bar.y - 5"
                    fill="rgb(75, 85, 99)"
                    text-anchor="middle"
                    dominant-baseline="bottom"
                    style="font-size: 11px; font-weight: 500"
                    class="dark:[fill:rgb(209,213,219)]"
                  >
                    {{ bar.count }}
                  </text>
                </g>
                <!-- X-axis tick marks and labels -->
                <g v-for="(bar, index) in weeklyBarChartData" :key="`weekly-x-tick-${index}`">
                  <line
                    :x1="bar.centerX"
                    y1="190"
                    :x2="bar.centerX"
                    y2="193"
                    stroke="rgb(156, 163, 175)"
                    stroke-width="1"
                    class="dark:[stroke:rgb(107,114,128)]"
                  />
                  <text
                    :x="bar.centerX"
                    y="212"
                    fill="rgb(75, 85, 99)"
                    text-anchor="middle"
                    style="font-size: 11px; font-weight: 500"
                    class="dark:[fill:rgb(156,163,175)]"
                  >
                    {{ bar.label }}
                  </text>
                </g>
              </svg>
            </div>

            <!-- Monthly Trend Bar Chart -->
            <div
              v-if="archiveStats?.monthlyTrend.length"
              class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              @click="openChartModal('monthly')"
            >
              <h4 class="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Monthly (Last 12 Months)
              </h4>
              <svg viewBox="0 0 400 220" class="w-full h-48" preserveAspectRatio="xMidYMid meet">
                <!-- Y-axis -->
                <line
                  x1="50"
                  y1="30"
                  x2="50"
                  y2="190"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:stroke-gray-500"
                />
                <!-- X-axis -->
                <line
                  x1="50"
                  y1="190"
                  x2="370"
                  y2="190"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <!-- Y-axis label -->
                <text
                  x="15"
                  y="110"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  transform="rotate(-90 15 110)"
                  style="font-size: 12px"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  Tasks
                </text>
                <!-- Y-axis ticks and labels -->
                <g v-for="(tick, index) in 4" :key="`monthly-y-tick-${index}`">
                  <line
                    x1="48"
                    :y1="30 + (index * 160) / 3"
                    x2="50"
                    :y2="30 + (index * 160) / 3"
                    stroke="rgb(156, 163, 175)"
                    stroke-width="1"
                    class="dark:[stroke:rgb(107,114,128)]"
                  />
                  <text
                    x="45"
                    :y="35 + (index * 160) / 3"
                    fill="rgb(75, 85, 99)"
                    text-anchor="end"
                    dominant-baseline="middle"
                    style="font-size: 11px"
                    class="dark:[fill:rgb(156,163,175)]"
                  >
                    {{ Math.round(maxMonthlyCount - (maxMonthlyCount / 3) * index) }}
                  </text>
                </g>
                <!-- Bars -->
                <g v-for="(bar, index) in monthlyBarChartData" :key="`monthly-bar-${index}`">
                  <rect
                    :x="bar.x"
                    :y="bar.y"
                    :width="bar.width"
                    :height="bar.height"
                    fill="rgb(168, 85, 247)"
                    class="dark:fill-purple-400 cursor-pointer hover:opacity-80 transition-opacity"
                    :title="`${bar.label}: ${bar.count} tasks${bar.mits > 0 ? ` (${bar.mits} MITs)` : ''}`"
                  />
                  <!-- Data label on top of bar -->
                  <text
                    v-if="bar.count > 0"
                    :x="bar.centerX"
                    :y="bar.y - 5"
                    fill="rgb(75, 85, 99)"
                    text-anchor="middle"
                    dominant-baseline="bottom"
                    style="font-size: 11px; font-weight: 500"
                    class="dark:[fill:rgb(209,213,219)]"
                  >
                    {{ bar.count }}
                  </text>
                </g>
                <!-- X-axis tick marks and labels -->
                <g v-for="(bar, index) in monthlyBarChartData" :key="`monthly-x-tick-${index}`">
                  <line
                    :x1="bar.centerX"
                    y1="190"
                    :x2="bar.centerX"
                    y2="193"
                    stroke="rgb(156, 163, 175)"
                    stroke-width="1"
                    class="dark:[stroke:rgb(107,114,128)]"
                  />
                  <text
                    :x="bar.centerX"
                    y="212"
                    fill="rgb(75, 85, 99)"
                    text-anchor="middle"
                    style="font-size: 11px; font-weight: 500"
                    class="dark:[fill:rgb(156,163,175)]"
                  >
                    {{ bar.label.split(' ')[0] }}
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        <!-- Insights -->
        <div
          v-if="closedTasksMetrics.avgDaysToClose > 0"
          class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Insights</h3>
          <div class="text-sm text-gray-700 dark:text-gray-300">
            <p>
              Average time to close tasks:
              <strong>{{ closedTasksMetrics.avgDaysToClose }} days</strong>
            </p>
          </div>
        </div>

        <!-- Closed Tasks List with Bulk Delete -->
        <div v-if="closedTasks.length > 0" class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4"
          >
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Closed Tasks</h3>
            <button
              v-if="selectedTasks.length > 0"
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              @click="handleBulkDelete"
            >
              <Icon name="mdi:delete" size="20" />
              <span>Delete Selected ({{ selectedTasks.length }})</span>
            </button>
          </div>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="task in closedTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <input
                :id="`task-${task.id}`"
                v-model="selectedTasks"
                type="checkbox"
                :value="task.id"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label :for="`task-${task.id}`" class="flex-1 cursor-pointer">
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    :class="[
                      'text-sm',
                      task.is_mit
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : 'text-gray-900 dark:text-gray-100',
                    ]"
                  >
                    {{ task.title }}
                  </span>
                  <span
                    v-if="task.theme"
                    class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded"
                  >
                    {{ task.theme }}
                  </span>
                  <span
                    v-if="task.is_mit"
                    class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded font-medium"
                  >
                    MIT
                  </span>
                  <span v-if="task.planned_date" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDateToDisplay(task.planned_date) }}
                  </span>
                </div>
                <div v-if="task.notes" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {{ task.notes }}
                </div>
              </label>
              <button
                class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                @click="handleDelete(task.id)"
              >
                <Icon name="mdi:delete" size="20" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart Modal -->
      <div
        v-if="selectedChart"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4"
        @click.self="closeChartModal"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto relative"
          @click.stop
        >
          <!-- Close Button -->
          <button
            class="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="closeChartModal"
          >
            <Icon name="mdi:close" size="24" class="text-gray-600 dark:text-gray-300" />
          </button>

          <!-- Daily Chart Modal -->
          <div v-if="selectedChart === 'daily' && archiveStats?.dailyTrend.length" class="p-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Daily Completion Trend (Last 30 Days)
            </h2>
            <svg viewBox="0 0 800 400" class="w-full h-96" preserveAspectRatio="xMidYMid meet">
              <!-- Y-axis -->
              <line
                x1="60"
                y1="40"
                x2="60"
                y2="360"
                stroke="rgb(156, 163, 175)"
                stroke-width="2"
                class="dark:[stroke:rgb(107,114,128)]"
              />
              <!-- X-axis -->
              <line
                x1="60"
                y1="360"
                x2="760"
                y2="360"
                stroke="rgb(156, 163, 175)"
                stroke-width="2"
                class="dark:[stroke:rgb(107,114,128)]"
              />
              <!-- Y-axis label -->
              <text
                x="30"
                y="200"
                fill="rgb(75, 85, 99)"
                text-anchor="middle"
                transform="rotate(-90 30 200)"
                style="font-size: 14px; font-weight: 600"
                class="dark:[fill:rgb(156,163,175)]"
              >
                Tasks
              </text>
              <!-- Y-axis ticks and labels -->
              <g v-for="(tick, index) in 5" :key="`modal-daily-y-tick-${index}`">
                <line
                  x1="58"
                  :y1="40 + (index * 320) / 4"
                  x2="60"
                  :y2="40 + (index * 320) / 4"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <text
                  x="55"
                  :y="45 + (index * 320) / 4"
                  fill="rgb(75, 85, 99)"
                  text-anchor="end"
                  dominant-baseline="middle"
                  style="font-size: 12px"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  {{ Math.round(maxDailyCount - (maxDailyCount / 4) * index) }}
                </text>
              </g>
              <!-- Bars -->
              <g v-for="(bar, index) in modalDailyBarChartData" :key="`modal-daily-bar-${index}`">
                <rect
                  :x="bar.x"
                  :y="bar.y"
                  :width="bar.width"
                  :height="bar.height"
                  fill="rgb(59, 130, 246)"
                  class="dark:fill-blue-400 cursor-pointer hover:opacity-80 transition-opacity"
                  :title="`${bar.date}: ${bar.count} tasks${bar.mits > 0 ? ` (${bar.mits} MITs)` : ''}`"
                />
                <!-- Data label -->
                <text
                  v-if="bar.count > 0"
                  :x="bar.centerX"
                  :y="bar.y - 8"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  dominant-baseline="bottom"
                  style="font-size: 13px; font-weight: 600"
                  class="dark:[fill:rgb(209,213,219)]"
                >
                  {{ bar.count }}
                </text>
              </g>
              <!-- X-axis labels -->
              <g
                v-for="(bar, index) in modalDailyBarChartData"
                :key="`modal-daily-x-tick-${index}`"
              >
                <line
                  :x1="bar.centerX"
                  y1="360"
                  :x2="bar.centerX"
                  y2="365"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <text
                  v-if="
                    index % Math.ceil(modalDailyBarChartData.length / 10) === 0 ||
                    index === modalDailyBarChartData.length - 1
                  "
                  :x="bar.centerX"
                  y="378"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  style="font-size: 12px; font-weight: 500"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  {{ bar.date }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Weekly Chart Modal -->
          <div v-if="selectedChart === 'weekly' && archiveStats?.weeklyTrend.length" class="p-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Weekly Completion Trend (Last 12 Weeks)
            </h2>
            <svg viewBox="0 0 800 400" class="w-full h-96" preserveAspectRatio="xMidYMid meet">
              <!-- Y-axis -->
              <line
                x1="60"
                y1="40"
                x2="60"
                y2="360"
                stroke="rgb(156, 163, 175)"
                stroke-width="2"
                class="dark:[stroke:rgb(107,114,128)]"
              />
              <!-- X-axis -->
              <line
                x1="60"
                y1="360"
                x2="760"
                y2="360"
                stroke="rgb(156, 163, 175)"
                stroke-width="2"
                class="dark:[stroke:rgb(107,114,128)]"
              />
              <!-- Y-axis label -->
              <text
                x="30"
                y="200"
                fill="rgb(75, 85, 99)"
                text-anchor="middle"
                transform="rotate(-90 30 200)"
                style="font-size: 14px; font-weight: 600"
                class="dark:[fill:rgb(156,163,175)]"
              >
                Tasks
              </text>
              <!-- Y-axis ticks and labels -->
              <g v-for="(tick, index) in 5" :key="`modal-weekly-y-tick-${index}`">
                <line
                  x1="58"
                  :y1="40 + (index * 320) / 4"
                  x2="60"
                  :y2="40 + (index * 320) / 4"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <text
                  x="55"
                  :y="45 + (index * 320) / 4"
                  fill="rgb(75, 85, 99)"
                  text-anchor="end"
                  dominant-baseline="middle"
                  style="font-size: 12px"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  {{ Math.round(maxWeeklyCount - (maxWeeklyCount / 4) * index) }}
                </text>
              </g>
              <!-- Bars -->
              <g v-for="(bar, index) in modalWeeklyBarChartData" :key="`modal-weekly-bar-${index}`">
                <rect
                  :x="bar.x"
                  :y="bar.y"
                  :width="bar.width"
                  :height="bar.height"
                  fill="rgb(34, 197, 94)"
                  class="dark:fill-green-400 cursor-pointer hover:opacity-80 transition-opacity"
                  :title="`${bar.label}: ${bar.count} tasks${bar.mits > 0 ? ` (${bar.mits} MITs)` : ''}`"
                />
                <!-- Data label -->
                <text
                  v-if="bar.count > 0"
                  :x="bar.centerX"
                  :y="bar.y - 8"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  dominant-baseline="bottom"
                  style="font-size: 13px; font-weight: 600"
                  class="dark:[fill:rgb(209,213,219)]"
                >
                  {{ bar.count }}
                </text>
              </g>
              <!-- X-axis labels -->
              <g
                v-for="(bar, index) in modalWeeklyBarChartData"
                :key="`modal-weekly-x-tick-${index}`"
              >
                <line
                  :x1="bar.centerX"
                  y1="360"
                  :x2="bar.centerX"
                  y2="365"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <text
                  :x="bar.centerX"
                  y="378"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  style="font-size: 12px; font-weight: 500"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  {{ bar.label }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Monthly Chart Modal -->
          <div v-if="selectedChart === 'monthly' && archiveStats?.monthlyTrend.length" class="p-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Monthly Completion Trend (Last 12 Months)
            </h2>
            <svg viewBox="0 0 800 400" class="w-full h-96" preserveAspectRatio="xMidYMid meet">
              <!-- Y-axis -->
              <line
                x1="60"
                y1="40"
                x2="60"
                y2="360"
                stroke="rgb(156, 163, 175)"
                stroke-width="2"
                class="dark:[stroke:rgb(107,114,128)]"
              />
              <!-- X-axis -->
              <line
                x1="60"
                y1="360"
                x2="760"
                y2="360"
                stroke="rgb(156, 163, 175)"
                stroke-width="2"
                class="dark:[stroke:rgb(107,114,128)]"
              />
              <!-- Y-axis label -->
              <text
                x="30"
                y="200"
                fill="rgb(75, 85, 99)"
                text-anchor="middle"
                transform="rotate(-90 30 200)"
                style="font-size: 14px; font-weight: 600"
                class="dark:[fill:rgb(156,163,175)]"
              >
                Tasks
              </text>
              <!-- Y-axis ticks and labels -->
              <g v-for="(tick, index) in 5" :key="`modal-monthly-y-tick-${index}`">
                <line
                  x1="58"
                  :y1="40 + (index * 320) / 4"
                  x2="60"
                  :y2="40 + (index * 320) / 4"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <text
                  x="55"
                  :y="45 + (index * 320) / 4"
                  fill="rgb(75, 85, 99)"
                  text-anchor="end"
                  dominant-baseline="middle"
                  style="font-size: 12px"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  {{ Math.round(maxMonthlyCount - (maxMonthlyCount / 4) * index) }}
                </text>
              </g>
              <!-- Bars -->
              <g
                v-for="(bar, index) in modalMonthlyBarChartData"
                :key="`modal-monthly-bar-${index}`"
              >
                <rect
                  :x="bar.x"
                  :y="bar.y"
                  :width="bar.width"
                  :height="bar.height"
                  fill="rgb(168, 85, 247)"
                  class="dark:fill-purple-400 cursor-pointer hover:opacity-80 transition-opacity"
                  :title="`${bar.label}: ${bar.count} tasks${bar.mits > 0 ? ` (${bar.mits} MITs)` : ''}`"
                />
                <!-- Data label -->
                <text
                  v-if="bar.count > 0"
                  :x="bar.centerX"
                  :y="bar.y - 8"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  dominant-baseline="bottom"
                  style="font-size: 13px; font-weight: 600"
                  class="dark:[fill:rgb(209,213,219)]"
                >
                  {{ bar.count }}
                </text>
              </g>
              <!-- X-axis labels -->
              <g
                v-for="(bar, index) in modalMonthlyBarChartData"
                :key="`modal-monthly-x-tick-${index}`"
              >
                <line
                  :x1="bar.centerX"
                  y1="360"
                  :x2="bar.centerX"
                  y2="365"
                  stroke="rgb(156, 163, 175)"
                  stroke-width="1.5"
                  class="dark:[stroke:rgb(107,114,128)]"
                />
                <text
                  :x="bar.centerX"
                  y="378"
                  fill="rgb(75, 85, 99)"
                  text-anchor="middle"
                  style="font-size: 12px; font-weight: 500"
                  class="dark:[fill:rgb(156,163,175)]"
                >
                  {{ bar.label.split(' ')[0] }}
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
