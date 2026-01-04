<script setup lang="ts">
import type { Task } from '~/server/api/planner/tasks.get'
import {
  getLocalDateString,
  formatDateToDisplay,
  parseDisplayDate,
} from '~/utils/common/dateParser'
import {
  groupTasksByQuadrant,
  parseDelegationStatus,
  enrichTaskWithQuadrant,
} from '~/utils/planner/eisenhower'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const route = useRoute()
const { fetchTasks } = useTasks()

// Accept date in either format, but convert to YYYY-MM-DD for filtering
const inputDate = (route.query.date as string) || getLocalDateString()
const date = ref(parseDisplayDate(inputDate) || inputDate)
const tasks = ref<Task[]>([])
const isLoading = ref(true)

const formattedDate = computed(() => {
  return formatDateToDisplay(date.value) || date.value
})

// Filter done tasks once for reuse
const activeTasks = computed(() => tasks.value.filter((t) => t.status !== 'done'))

// Eisenhower Matrix data
const quadrantData = computed(() => {
  return groupTasksByQuadrant(activeTasks.value, date.value)
})

// Administrative tasks (meeting, email, admin tags) - Top 10
const administrativeTasks = computed(() => {
  const adminTags = new Set(['meeting', 'email', 'admin'])
  return activeTasks.value
    .map((t) => enrichTaskWithQuadrant(t, date.value))
    .filter((t) => adminTags.has(parseDelegationStatus(t.notes)))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10)
})

// Top 10 priority tasks
const top10Tasks = computed(() => {
  const quadrantOrder: Record<string, number> = { Q1: 4, Q2: 3, Q3: 2, Q4: 1 }
  return activeTasks.value
    .map((t) => enrichTaskWithQuadrant(t, date.value))
    .filter((t) => t.delegationStatus !== 'delegate')
    .sort((a, b) => {
      const quadrantDiff = quadrantOrder[b.quadrant] - quadrantOrder[a.quadrant]
      return quadrantDiff !== 0 ? quadrantDiff : b.priorityScore - a.priorityScore
    })
    .slice(0, 10)
})

// Top 10 MITs
const top10Mits = computed(() => {
  return activeTasks.value
    .filter((t) => t.is_mit)
    .map((t) => enrichTaskWithQuadrant(t, date.value))
    .sort((a, b) => {
      const quadrantOrder: Record<string, number> = { Q1: 4, Q2: 3, Q3: 2, Q4: 1 }
      const quadrantDiff = quadrantOrder[b.quadrant] - quadrantOrder[a.quadrant]
      return quadrantDiff !== 0 ? quadrantDiff : b.priorityScore - a.priorityScore
    })
    .slice(0, 10)
})

// Tasks by theme/bucket - Top 10 themes with their top tasks
const tasksByTheme = computed(() => {
  const themeMap = new Map<string, Task[]>()
  activeTasks.value.forEach((task) => {
    const theme = task.theme || 'No Bucket'
    if (!themeMap.has(theme)) {
      themeMap.set(theme, [])
    }
    themeMap.get(theme)!.push(task)
  })

  return Array.from(themeMap.entries())
    .map(([theme, themeTasks]) => ({
      theme,
      count: themeTasks.length,
      tasks: themeTasks
        .map((t) => enrichTaskWithQuadrant(t, date.value))
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 10), // Top 10 tasks per theme
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 themes
})

const loadTasks = async () => {
  try {
    const allTasks = await fetchTasks()
    tasks.value = allTasks
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    isLoading.value = false
  }
}

const handlePrint = () => {
  window.print()
}

const handleBack = (event?: Event) => {
  if (!import.meta.client) return

  // Prevent default behavior and stop propagation
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  // Use window.location.href for reliable navigation
  // This ensures a full page load and avoids blank page issues
  // that can occur with SPA navigation in modal contexts
  window.location.href = '/dev/planner'
}

// Close on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleBack(e) // Pass event to allow preventDefault() to be called
  }
}

onMounted(() => {
  loadTasks()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Modal Overlay -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="handleBack"
  >
    <!-- Modal Content -->
    <div
      class="print-modal bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
    >
      <!-- Header with Back Button -->
      <div
        class="no-print sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10"
      >
        <button
          class="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
          @click="handleBack"
        >
          <Icon name="mdi:arrow-left" size="18" class="sm:w-5 sm:h-5" />
          <span class="hidden sm:inline">Back</span>
        </button>
        <div class="flex items-center gap-2 sm:gap-4">
          <h1 class="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            {{ formattedDate }}
          </h1>
          <button
            class="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
            @click="handlePrint"
          >
            <Icon name="mdi:printer" size="18" class="sm:w-5 sm:h-5" />
            <span class="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <!-- Print Content -->
      <div class="p-4 sm:p-8">
        <div v-if="isLoading" class="text-center py-12">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
          ></div>
        </div>

        <!-- Print Content -->
        <section v-else class="print-content">
          <!-- Top 10 Priority Tasks -->
          <div class="mb-3 print-section">
            <h2 class="text-sm font-bold mb-1 print-heading">Top 10 Priority Tasks</h2>
            <ul class="space-y-0.5 text-xs print-list">
              <li v-for="(task, index) in top10Tasks" :key="task.id" class="flex items-start gap-1">
                <span class="font-bold">{{ index + 1 }}.</span>
                <span class="flex-1">{{ task.title }}</span>
                <span class="text-gray-500 text-[8pt]">{{ task.quadrant }}</span>
              </li>
            </ul>
          </div>

          <!-- Top 10 MITs -->
          <div v-if="top10Mits.length > 0" class="mb-3 print-section">
            <h2 class="text-sm font-bold mb-1 print-heading">Top 10 MITs (Most Important Tasks)</h2>
            <ul class="space-y-0.5 text-xs print-list">
              <li v-for="task in top10Mits" :key="task.id" class="flex items-start gap-1">
                <span class="font-bold">★</span>
                <span class="flex-1">{{ task.title }}</span>
                <span class="text-gray-500 text-[8pt]">{{ task.quadrant }}</span>
              </li>
            </ul>
          </div>

          <!-- Administrative Tasks -->
          <div v-if="administrativeTasks.length > 0" class="mb-3 print-section">
            <h2 class="text-sm font-bold mb-1 print-heading">
              Administrative Tasks ({{ administrativeTasks.length }})
            </h2>
            <ul class="space-y-0.5 text-xs print-list">
              <li v-for="task in administrativeTasks" :key="task.id" class="flex items-start gap-1">
                <span>☐</span>
                <span class="flex-1">{{ task.title }}</span>
              </li>
            </ul>
          </div>

          <!-- Tasks by Theme/Bucket -->
          <div v-if="tasksByTheme.length > 0" class="mb-3 print-section">
            <h2 class="text-sm font-bold mb-1 print-heading">Tasks by Bucket (Top 10)</h2>
            <div class="space-y-2">
              <div
                v-for="themeGroup in tasksByTheme"
                :key="themeGroup.theme"
                class="print-theme-group"
              >
                <h3 class="text-xs font-semibold mb-0.5">
                  {{ themeGroup.theme }} ({{ themeGroup.count }})
                </h3>
                <ul class="space-y-0.5 text-[9pt] print-list ml-2">
                  <li
                    v-for="task in themeGroup.tasks.slice(0, 5)"
                    :key="task.id"
                    class="flex items-start gap-1"
                  >
                    <span>☐</span>
                    <span class="flex-1">{{ task.title }}</span>
                  </li>
                  <li v-if="themeGroup.tasks.length > 5" class="text-[8pt] text-gray-500 italic">
                    +{{ themeGroup.tasks.length - 5 }} more
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Eisenhower Matrix -->
          <div class="print-matrix">
            <h2 class="text-sm font-bold mb-1 print-heading">Eisenhower Matrix</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 print-grid">
              <!-- Q1: Do Now -->
              <div class="border border-red-400 rounded p-1.5 print-quadrant print-q1">
                <h3 class="font-bold text-xs text-red-700 mb-0.5">
                  Q1: Urgent & Important ({{ quadrantData[0].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[0].tasks.slice(0, 10)"
                    :key="task.id"
                    class="flex items-start gap-1"
                  >
                    <span>☐</span>
                    <span class="flex-1">{{ task.title }}</span>
                  </li>
                </ul>
              </div>

              <!-- Q2: Schedule -->
              <div class="border border-blue-400 rounded p-1.5 print-quadrant print-q2">
                <h3 class="font-bold text-xs text-blue-700 mb-0.5">
                  Q2: Important & Not Urgent ({{ quadrantData[1].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[1].tasks.slice(0, 10)"
                    :key="task.id"
                    class="flex items-start gap-1"
                  >
                    <span>☐</span>
                    <span class="flex-1">{{ task.title }}</span>
                  </li>
                </ul>
              </div>

              <!-- Q3: Defer/Batch -->
              <div class="border border-yellow-400 rounded p-1.5 print-quadrant print-q3">
                <h3 class="font-bold text-xs text-yellow-700 mb-0.5">
                  Q3: Urgent & Not Important ({{ quadrantData[2].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[2].tasks.slice(0, 10)"
                    :key="task.id"
                    class="flex items-start gap-1"
                  >
                    <span>☐</span>
                    <span class="flex-1">{{ task.title }}</span>
                  </li>
                </ul>
              </div>

              <!-- Q4: Later / Parking Lot -->
              <div class="border border-gray-400 rounded p-1.5 print-quadrant print-q4">
                <h3 class="font-bold text-xs text-gray-600 mb-0.5">
                  Q4: Not Urgent & Not Important ({{ quadrantData[3].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[3].tasks.slice(0, 10)"
                    :key="task.id"
                    class="flex items-start gap-1"
                  >
                    <span>☐</span>
                    <span class="flex-1">{{ task.title }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  /* Hide overlay and modal styling when printing */
  .print-modal {
    position: static;
    max-width: 100%;
    max-height: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none;
    background: white;
  }

  /* Hide header with buttons when printing */
  .no-print {
    display: none;
  }

  /* Print styling - compact */
  .print-content {
    padding: 0.25in;
    font-size: 10pt;
    line-height: 1.2;
  }

  @page {
    margin: 0.25in;
    size: letter;
  }

  /* Ensure text is black for printing */
  .print-content {
    color: black;
  }

  .print-content h2,
  .print-content h3,
  .print-content span,
  .print-content li {
    color: black;
  }

  /* Compact sections */
  .print-heading {
    font-size: 10pt;
    margin-bottom: 2pt;
    color: black;
  }

  .print-list {
    font-size: 9pt;
    line-height: 1.3;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .print-list li {
    margin: 0;
    padding: 1pt 0;
  }

  .print-section {
    margin-bottom: 8pt;
    page-break-inside: avoid;
  }

  .print-theme-group {
    margin-bottom: 4pt;
    padding-bottom: 2pt;
    border-bottom: 0.5pt solid #ccc;
  }

  .print-theme-group:last-child {
    border-bottom: none;
  }

  /* Compact matrix */
  .print-matrix {
    page-break-inside: avoid;
  }

  .print-grid {
    gap: 4pt;
  }

  .print-quadrant {
    padding: 4pt;
    page-break-inside: avoid;
    min-height: auto;
  }

  .print-quadrant h3 {
    font-size: 9pt;
    margin-bottom: 2pt;
    padding-bottom: 1pt;
    border-bottom: 1pt solid currentColor;
  }

  .print-quadrant-list {
    font-size: 8pt;
    line-height: 1.25;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .print-quadrant-list li {
    margin: 0;
    padding: 1pt 0;
    page-break-inside: avoid;
  }

  /* Remove backgrounds for print */
  .print-q1,
  .print-q2,
  .print-q3,
  .print-q4 {
    background: white !important;
  }

  /* Limit items to top 10 - handled in template with .slice(0, 10) */
}

/* Screen styling */
.print-heading {
  @apply text-gray-900 dark:text-gray-100;
}

.print-list {
  @apply text-gray-900 dark:text-gray-100;
}
</style>
