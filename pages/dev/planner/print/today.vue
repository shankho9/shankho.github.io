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

// Administrative tasks (meeting, email, admin tags)
const administrativeTasks = computed(() => {
  const adminTags = new Set(['meeting', 'email', 'admin'])
  return activeTasks.value
    .map((t) => enrichTaskWithQuadrant(t, date.value))
    .filter((t) => adminTags.has(parseDelegationStatus(t.notes)))
    .sort((a, b) => b.priorityScore - a.priorityScore)
})

// Top 5 tasks that need to be completed (sorted by priority)
const top5Tasks = computed(() => {
  const quadrantOrder: Record<string, number> = { Q1: 4, Q2: 3, Q3: 2, Q4: 1 }
  return activeTasks.value
    .map((t) => enrichTaskWithQuadrant(t, date.value))
    .filter((t) => t.delegationStatus !== 'delegate')
    .sort((a, b) => {
      const quadrantDiff = quadrantOrder[b.quadrant] - quadrantOrder[a.quadrant]
      return quadrantDiff !== 0 ? quadrantDiff : b.priorityScore - a.priorityScore
    })
    .slice(0, 5)
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

const handleBack = () => {
  if (!import.meta.client) return
  window.location.href = '/dev/planner'
}

// Close on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleBack()
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
          <!-- Top 5 Tasks -->
          <div class="mb-3 print-top-tasks">
            <h2 class="text-sm font-bold mb-1 print-heading">Top 5 Tasks</h2>
            <ul class="space-y-0.5 text-xs print-list">
              <li v-for="(task, index) in top5Tasks" :key="task.id" class="flex items-start gap-1">
                <span class="font-bold">{{ index + 1 }}.</span>
                <span class="flex-1">{{ task.title }}</span>
              </li>
            </ul>
          </div>

          <!-- Administrative Tasks -->
          <div class="mb-3 print-admin-tasks">
            <h2 class="text-sm font-bold mb-1 print-heading">
              Admin ({{ administrativeTasks.length }})
            </h2>
            <ul class="space-y-0.5 text-xs print-list">
              <li
                v-for="task in administrativeTasks.slice(0, 8)"
                :key="task.id"
                class="flex items-start gap-1"
              >
                <span>☐</span>
                <span class="flex-1">{{ task.title }}</span>
              </li>
            </ul>
          </div>

          <!-- Eisenhower Matrix -->
          <div class="print-matrix">
            <h2 class="text-sm font-bold mb-1 print-heading">Matrix</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 print-grid">
              <!-- Q1: Do Now -->
              <div class="border border-red-400 rounded p-1.5 print-quadrant print-q1">
                <h3 class="font-bold text-xs text-red-700 mb-0.5">
                  Q1 ({{ quadrantData[0].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[0].tasks.slice(0, 6)"
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
                  Q2 ({{ quadrantData[1].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[1].tasks.slice(0, 6)"
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
                  Q3 ({{ quadrantData[2].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[2].tasks.slice(0, 6)"
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
                  Q4 ({{ quadrantData[3].tasks.length }})
                </h3>
                <ul class="space-y-0.5 text-xs print-quadrant-list">
                  <li
                    v-for="task in quadrantData[3].tasks.slice(0, 6)"
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

  .print-top-tasks,
  .print-admin-tasks {
    margin-bottom: 6pt;
    page-break-inside: avoid;
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

  /* Limit items to fit on page */
  .print-quadrant-list li:nth-child(n + 7) {
    display: none;
  }

  .print-list li:nth-child(n + 6) {
    display: none;
  }
}

/* Screen styling */
.print-heading {
  @apply text-gray-900 dark:text-gray-100;
}

.print-list {
  @apply text-gray-900 dark:text-gray-100;
}
</style>
