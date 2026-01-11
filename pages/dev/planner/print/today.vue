<script setup lang="ts">
import type { Task } from '~/server/api/planner/tasks.get'
import { getLocalDateString, formatDateToDisplay } from '~/utils/common/dateParser'
import { groupTasksByQuadrant, enrichTaskWithQuadrant } from '~/utils/planner/eisenhower'

definePageMeta({
  layout: false, // No layout for print page
  middleware: 'auth-planner',
})

const { fetchTasks } = useTasks()
const colorMode = useColorMode()

const tasks = ref<Task[]>([])
const isLoading = ref(true)

// Filter out closed tasks
const openTasks = computed(() => tasks.value.filter((t) => t.status !== 'done'))

// Top 15 tasks prioritized by MITs and then by date (earliest date first)
const top15Tasks = computed(() => {
  const enriched = openTasks.value.map((t) => enrichTaskWithQuadrant(t, getLocalDateString()))

  // Sort: MITs first, then by planned_date (earliest date first)
  return enriched
    .sort((a, b) => {
      // MITs come first
      if (a.is_mit !== b.is_mit) {
        return b.is_mit ? 1 : -1
      }
      // Then by planned_date (earliest date first)
      // Tasks without dates go to the end
      if (!a.planned_date && !b.planned_date) return 0
      if (!a.planned_date) return 1
      if (!b.planned_date) return -1
      // Compare dates - earlier dates come first
      return a.planned_date.localeCompare(b.planned_date)
    })
    .slice(0, 15)
})

// Eisenhower Matrix data - limit to top 10 per quadrant
const quadrantData = computed(() => {
  const quadrants = groupTasksByQuadrant(openTasks.value, getLocalDateString())

  return quadrants.map((quadrant) => {
    const top10 = quadrant.tasks.slice(0, 10)
    const remaining = quadrant.tasks.length - 10

    return {
      ...quadrant,
      tasks: top10,
      remainingCount: remaining > 0 ? remaining : 0,
    }
  })
})

const loadTasks = async () => {
  isLoading.value = true
  try {
    const allTasks = await fetchTasks()
    tasks.value = allTasks
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    isLoading.value = false
  }
}

const closePage = () => {
  navigateTo('/dev/planner')
}

const handlePrint = () => {
  window.print()
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closePage()
  }
}

onMounted(() => {
  loadTasks()
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<template>
  <div class="print-page" :class="colorMode.value === 'dark' ? 'dark' : ''">
    <!-- Control Buttons -->
    <div class="controls print:hidden">
      <button class="close-button" @click="closePage">
        <Icon name="mdi:close" size="20" />
      </button>
      <button class="print-button" @click="handlePrint">
        <Icon name="mdi:printer" size="20" />
        <span>Print</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div>Loading...</div>
    </div>

    <!-- Main Content -->
    <div v-else class="content">
      <!-- Header -->
      <div class="header">
        <h1 class="title">Task Summary</h1>
        <div class="date">{{ formatDateToDisplay(getLocalDateString()) }}</div>
      </div>

      <!-- Top 15 Tasks -->
      <div class="section">
        <h2 class="section-title">Top 15 Priority Tasks</h2>
        <div class="task-list">
          <div v-for="(task, index) in top15Tasks" :key="task.id" class="task-item">
            <div class="task-number">{{ index + 1 }}</div>
            <div class="task-content">
              <div class="task-title-row">
                <span :class="['task-title', task.is_mit ? 'task-title-mit' : '']">
                  {{ task.title }}
                </span>
                <span
                  v-if="task.rollover_count && task.rollover_count > 0"
                  class="font-bold text-red-600 dark:text-red-400 ml-1"
                  style="font-weight: bold; color: rgb(220, 38, 38)"
                >
                  +{{ task.rollover_count }}
                </span>
                <span v-if="task.planned_date" class="task-date-inline">
                  {{ formatDateToDisplay(task.planned_date) }}
                </span>
                <span v-if="task.is_mit" class="mit-badge">MIT</span>
                <span v-if="task.theme" class="theme-badge">{{ task.theme }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Eisenhower Matrix -->
      <div class="section">
        <h2 class="section-title">Eisenhower Matrix</h2>
        <div class="matrix-grid">
          <div
            v-for="quadrant in quadrantData"
            :key="quadrant.quadrant"
            class="quadrant"
            :class="`quadrant-${quadrant.quadrant.toLowerCase()}`"
          >
            <div class="quadrant-header">
              <div class="quadrant-label">{{ quadrant.quadrant }}</div>
              <div class="quadrant-title">{{ quadrant.label }}</div>
              <div class="quadrant-description">{{ quadrant.description }}</div>
            </div>
            <div class="quadrant-tasks">
              <div v-for="task in quadrant.tasks" :key="task.id" class="matrix-task-item">
                <div class="matrix-task-title-row">
                  <span :class="['matrix-task-title', task.is_mit ? 'matrix-task-title-mit' : '']">
                    {{ task.title }}
                  </span>
                  <span
                    v-if="task.rollover_count && task.rollover_count > 0"
                    class="font-bold text-red-600 dark:text-red-400 ml-1"
                    style="font-weight: bold; color: rgb(220, 38, 38)"
                  >
                    +{{ task.rollover_count }}
                  </span>
                  <span v-if="task.is_mit" class="matrix-mit-badge">MIT</span>
                  <span v-if="task.theme" class="matrix-theme-badge">{{ task.theme }}</span>
                </div>
              </div>
              <div v-if="quadrant.remainingCount > 0" class="more-tasks">
                +{{ quadrant.remainingCount }} more
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Print Page Container - A4 size optimized */
.print-page {
  min-height: 100vh;
  background: white;
  padding: 20px;
  position: relative;
}

.print-page.dark {
  background: #1a1a1a;
  color: #e5e5e5;
}

@media print {
  .print-page {
    padding: 0;
    margin: 0;
    background: white !important;
  }

  @page {
    size: A4;
    margin: 10mm;
  }
}

/* Control Buttons */
.controls {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  gap: 10px;
}

.close-button,
.print-button {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  gap: 6px;
  padding: 0 12px;
}

.print-button {
  width: auto;
}

.close-button:hover,
.print-button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.print-page.dark .close-button,
.print-page.dark .print-button {
  background: rgba(255, 255, 255, 0.2);
  color: #e5e5e5;
}

.print-page.dark .close-button:hover,
.print-page.dark .print-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Loading State */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 18px;
  color: #666;
}

.print-page.dark .loading {
  color: #999;
}

/* Content */
.content {
  max-width: 210mm; /* A4 width */
  margin: 0 auto;
}

@media print {
  .content {
    max-width: 100%;
  }
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid #333;
}

.print-page.dark .header {
  border-bottom-color: #666;
}

.title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 6px 0;
  color: #1a1a1a;
}

.print-page.dark .title {
  color: #e5e5e5;
}

.date {
  font-size: 14px;
  color: #666;
}

.print-page.dark .date {
  color: #999;
}

@media print {
  .header {
    margin-bottom: 8px;
    padding-bottom: 6px;
  }

  .title {
    font-size: 20px;
    margin-bottom: 4px;
  }

  .date {
    font-size: 14px;
  }
}

/* Section */
.section {
  margin-bottom: 15px;
  page-break-inside: avoid;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #1a1a1a;
  border-bottom: 1px solid #ddd;
  padding-bottom: 6px;
}

.print-page.dark .section-title {
  color: #e5e5e5;
  border-bottom-color: #444;
}

@media print {
  .section {
    margin-bottom: 10px;
  }

  .section-title {
    font-size: 16px;
    margin-bottom: 6px;
    padding-bottom: 3px;
  }
}

/* Task List */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media print {
  .task-list {
    gap: 3px;
  }
}

.task-item {
  display: flex;
  gap: 8px;
  padding: 4px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  page-break-inside: avoid;
}

.print-page.dark .task-item {
  border-color: #444;
  background: #2a2a2a;
}

@media print {
  .task-item {
    padding: 2px 4px;
    border-width: 0.5px;
    gap: 6px;
  }
}

.task-number {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  font-weight: bold;
  font-size: 11px;
  color: #333;
}

.print-page.dark .task-number {
  background: #3a3a3a;
  color: #e5e5e5;
}

@media print {
  .task-number {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-title {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a1a;
}

.print-page.dark .task-title {
  color: #e5e5e5;
}

.task-title-mit {
  font-weight: bold;
  color: #dc2626;
}

.print-page.dark .task-title-mit {
  color: #ef4444;
}

@media print {
  .task-title {
    font-size: 11px;
  }
}

.task-date-inline {
  font-size: 10px;
  color: #666;
  font-weight: normal;
  margin-left: auto;
  flex-shrink: 0;
}

.print-page.dark .task-date-inline {
  color: #999;
}

@media print {
  .task-date-inline {
    font-size: 9px;
  }
}

.mit-badge {
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 2px;
  flex-shrink: 0;
}

.print-page.dark .mit-badge {
  background: #7f1d1d;
  color: #fca5a5;
}

@media print {
  .mit-badge {
    font-size: 8px;
    padding: 1px 4px;
  }
}

.theme-badge {
  font-size: 9px;
  padding: 1px 4px;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 2px;
  flex-shrink: 0;
}

.print-page.dark .theme-badge {
  background: #3b1f5f;
  color: #c4b5fd;
}

@media print {
  .theme-badge {
    font-size: 8px;
    padding: 1px 4px;
  }
}

/* Matrix Grid */
.matrix-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  page-break-inside: avoid;
  align-items: stretch;
}

@media print {
  .matrix-grid {
    gap: 4px;
  }
}

/* Quadrant */
.quadrant {
  border: 2px solid #333;
  border-radius: 4px;
  padding: 8px;
  page-break-inside: avoid;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
}

.quadrant-q1 {
  border-color: #dc2626;
  background: white;
}

.print-page.dark .quadrant-q1 {
  border-color: #ef4444;
  background: #1a1a1a;
}

.quadrant-q2 {
  border-color: #2563eb;
  background: white;
}

.print-page.dark .quadrant-q2 {
  border-color: #3b82f6;
  background: #1a1a1a;
}

.quadrant-q3 {
  border-color: #f59e0b;
  background: white;
}

.print-page.dark .quadrant-q3 {
  border-color: #fbbf24;
  background: #1a1a1a;
}

.quadrant-q4 {
  border-color: #6b7280;
  background: white;
}

.print-page.dark .quadrant-q4 {
  border-color: #9ca3af;
  background: #1a1a1a;
}

@media print {
  .quadrant {
    border-width: 1px;
    padding: 4px;
    min-height: 0;
    height: 100%;
  }

  .quadrant-q1,
  .quadrant-q2,
  .quadrant-q3,
  .quadrant-q4 {
    background: white !important;
    border-color: #333 !important;
  }
}

.quadrant-header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.print-page.dark .quadrant-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

@media print {
  .quadrant-header {
    margin-bottom: 4px;
    padding-bottom: 2px;
  }
}

.quadrant-label {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 2px;
  color: #1a1a1a;
}

.print-page.dark .quadrant-label {
  color: #e5e5e5;
}

@media print {
  .quadrant-label {
    font-size: 14px;
  }
}

.quadrant-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  color: #333;
}

.print-page.dark .quadrant-title {
  color: #d4d4d4;
}

@media print {
  .quadrant-title {
    font-size: 11px;
  }
}

.quadrant-description {
  font-size: 10px;
  color: #666;
}

.print-page.dark .quadrant-description {
  color: #999;
}

@media print {
  .quadrant-description {
    font-size: 9px;
  }
}

.quadrant-tasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
}

@media print {
  .quadrant-tasks {
    gap: 2px;
  }
}

.matrix-task-item {
  padding: 3px 4px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  page-break-inside: avoid;
  flex-shrink: 0;
}

.print-page.dark .matrix-task-item {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

@media print {
  .matrix-task-item {
    padding: 1px 3px;
    border-width: 0.5px;
    background: white !important;
  }
}

.matrix-task-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.matrix-task-title {
  font-size: 11px;
  font-weight: 500;
  color: #1a1a1a;
}

.print-page.dark .matrix-task-title {
  color: #e5e5e5;
}

.matrix-task-title-mit {
  font-weight: bold;
  color: #dc2626;
}

.print-page.dark .matrix-task-title-mit {
  color: #ef4444;
}

@media print {
  .matrix-task-title {
    font-size: 10px;
  }
}

.matrix-mit-badge {
  font-size: 8px;
  font-weight: bold;
  padding: 1px 3px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 2px;
}

.print-page.dark .matrix-mit-badge {
  background: #7f1d1d;
  color: #fca5a5;
}

@media print {
  .matrix-mit-badge {
    font-size: 8px;
    padding: 0 2px;
  }
}

.matrix-theme-badge {
  font-size: 8px;
  font-weight: normal;
  padding: 1px 3px;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 2px;
  flex-shrink: 0;
}

.print-page.dark .matrix-theme-badge {
  background: #3b1f5f;
  color: #c4b5fd;
}

@media print {
  .matrix-theme-badge {
    font-size: 8px;
    padding: 0 2px;
  }
}

.more-tasks {
  font-size: 10px;
  font-style: italic;
  color: #666;
  text-align: center;
  padding: 4px;
  margin-top: 2px;
}

.print-page.dark .more-tasks {
  color: #999;
}

@media print {
  .more-tasks {
    font-size: 9px;
    padding: 2px;
  }
}

/* Print Specific Styles */
@media print {
  .print-page {
    background: white !important;
    color: black !important;
  }

  .controls {
    display: none;
  }

  .task-item,
  .matrix-task-item {
    page-break-inside: avoid;
  }

  .section {
    page-break-inside: avoid;
  }

  /* Ensure good spacing for printing */
  .content {
    max-width: 100%;
  }

  /* Remove dark mode styling for print */
  .print-page.dark * {
    background: white !important;
    color: black !important;
    border-color: #333 !important;
  }
}
</style>
