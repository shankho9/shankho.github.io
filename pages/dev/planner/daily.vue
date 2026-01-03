<script setup lang="ts">
import { nextTick } from 'vue'
import type { Task } from '~/server/api/planner/tasks.get'
import { getLocalDateString, formatDateToDisplay } from '~/utils/common/dateParser'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { createTask, fetchThemes, fetchTasks } = useTasks()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const selectedTheme = ref<string | null>(null)
const availableThemes = ref<string[]>([])

// Quick add task
const quickTaskTitle = ref('')
const quickTaskTheme = ref<string | null>(null)
const quickTaskDate = ref<string>(getLocalDateString()) // Use YYYY-MM-DD for date picker
const isAddingQuickTask = ref(false)
const quickTaskInput = ref<HTMLInputElement | null>(null)
const isThemeInputVisible = ref(false)
const newThemeName = ref('')
const themeSuggestionsRef = ref<HTMLDivElement | null>(null)
const selectedThemeSuggestionIndex = ref(-1)

// Filter tasks to only those with planned_date
const tasksWithDates = computed(() => {
  return tasks.value.filter((t) => t.planned_date !== null)
})

// Group tasks by date
const tasksByDate = computed(() => {
  const grouped = new Map<string, Task[]>()

  tasksWithDates.value.forEach((task) => {
    const date = task.planned_date!
    if (!grouped.has(date)) {
      grouped.set(date, [])
    }
    grouped.get(date)!.push(task)
  })

  // Convert to array and sort by date (newest first)
  return Array.from(grouped.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, tasks]) => ({
      date,
      tasks: tasks.sort((a, b) => {
        // Sort by: MIT first, then priority, then created_at
        if (a.is_mit !== b.is_mit) return b.is_mit ? 1 : -1
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }),
    }))
})

const filteredTasksByDate = computed(() => {
  if (selectedTheme.value === null) return tasksByDate.value

  return tasksByDate.value
    .map((group) => ({
      date: group.date,
      tasks: group.tasks.filter((task) => {
        if (selectedTheme.value === '') return !task.theme
        return task.theme === selectedTheme.value
      }),
    }))
    .filter((group) => group.tasks.length > 0)
})

const getTasksByStatus = (tasks: Task[]) => {
  return {
    today: tasks.filter((t) => t.status === 'today'),
    doing: tasks.filter((t) => t.status === 'doing'),
    done: tasks.filter((t) => t.status === 'done'),
  }
}

const formatDate = (dateStr: string) => {
  const displayDate = formatDateToDisplay(dateStr)
  if (!displayDate) return dateStr

  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)
  const diffTime = taskDate.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return `${displayDate} (Today)`
  if (diffDays === 1) return `${displayDate} (Tomorrow)`
  if (diffDays === -1) return `${displayDate} (Yesterday)`
  if (diffDays > 0) return `${displayDate} (In ${diffDays} days)`
  return `${displayDate} (${Math.abs(diffDays)} days ago)`
}

const loadTasks = async () => {
  isLoading.value = true
  try {
    const allTasks = await fetchTasks()
    tasks.value = allTasks
    await loadThemes()
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    isLoading.value = false
  }
}

const loadThemes = async () => {
  try {
    availableThemes.value = await fetchThemes()
  } catch (error) {
    console.error('Failed to load themes:', error)
  }
}

const handleTaskUpdate = async (updatedTask: Task) => {
  const index = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (index !== -1) {
    tasks.value[index] = updatedTask
  } else {
    tasks.value.push(updatedTask)
  }
}

const handleTaskDelete = (id: number) => {
  tasks.value = tasks.value.filter((t) => t.id !== id)
}

const handleQuickAddTask = async () => {
  if (!quickTaskTitle.value.trim()) {
    isAddingQuickTask.value = false
    return
  }

  try {
    const theme = newThemeName.value.trim() || quickTaskTheme.value || null
    const newTask = await createTask({
      title: quickTaskTitle.value.trim(),
      status: 'today',
      planned_date: quickTaskDate.value || null, // Already in YYYY-MM-DD format from date picker
      theme: theme,
    })
    handleTaskUpdate(newTask)
    quickTaskTitle.value = ''
    quickTaskTheme.value = null
    quickTaskDate.value = getLocalDateString()
    newThemeName.value = ''
    isAddingQuickTask.value = false
    isThemeInputVisible.value = false
    await loadTasks()
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}

// Theme suggestions based on input
const themeSuggestions = computed(() => {
  if (!newThemeName.value.trim() || !isThemeInputVisible.value) return []
  return findSimilarStrings(newThemeName.value, availableThemes.value, {
    threshold: 0.3,
    maxResults: 5,
  })
})

const selectThemeSuggestion = (theme: string) => {
  quickTaskTheme.value = theme
  newThemeName.value = ''
  isThemeInputVisible.value = false
  selectedThemeSuggestionIndex.value = -1
}

const addNewTheme = () => {
  if (newThemeName.value.trim()) {
    const theme = newThemeName.value.trim()
    // Check for exact match (case-insensitive)
    const exactMatch = availableThemes.value.find(
      (t) => t.toLowerCase().trim() === theme.toLowerCase().trim(),
    )
    if (exactMatch) {
      // Use existing theme instead of creating duplicate
      quickTaskTheme.value = exactMatch
      newThemeName.value = ''
      isThemeInputVisible.value = false
      return
    }
    // Create new theme if no exact match
    quickTaskTheme.value = theme
    newThemeName.value = ''
    isThemeInputVisible.value = false
  }
}

const handleThemeInputKeydown = (event: KeyboardEvent) => {
  if (themeSuggestions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedThemeSuggestionIndex.value = Math.min(
      selectedThemeSuggestionIndex.value + 1,
      themeSuggestions.value.length - 1,
    )
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedThemeSuggestionIndex.value = Math.max(selectedThemeSuggestionIndex.value - 1, -1)
  } else if (event.key === 'Enter' && selectedThemeSuggestionIndex.value >= 0) {
    event.preventDefault()
    selectThemeSuggestion(themeSuggestions.value[selectedThemeSuggestionIndex.value])
  } else if (event.key === 'Escape') {
    selectedThemeSuggestionIndex.value = -1
  }
}

const handleQuickTaskEsc = () => {
  quickTaskTitle.value = ''
  isAddingQuickTask.value = false
}

const handleQuickTaskBlur = () => {
  setTimeout(() => {
    if (!quickTaskTitle.value) isAddingQuickTask.value = false
  }, 200)
}

const handleThemeInputEsc = () => {
  isThemeInputVisible.value = false
  newThemeName.value = ''
  selectedThemeSuggestionIndex.value = -1
}

onMounted(() => {
  loadTasks()
  // Focus quick input on mount for better UX
  nextTick(() => {
    quickTaskInput.value?.focus()
  })
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Daily Planner
          </h1>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            All tasks with due dates, grouped by date
          </p>
        </div>
        <NuxtLink
          to="/dev/planner"
          class="px-4 py-2.5 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
        >
          Dashboard
        </NuxtLink>
      </div>

      <!-- Theme Filter -->
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Theme:</span>
        <button
          :class="[
            'px-3 py-2 sm:py-1 text-sm rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0',
            selectedTheme === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
          ]"
          @click="selectedTheme = null"
        >
          All
        </button>
        <button
          :class="[
            'px-3 py-2 sm:py-1 text-sm rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0',
            selectedTheme === ''
              ? 'bg-gray-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
          ]"
          @click="selectedTheme = ''"
        >
          No Theme
        </button>
        <button
          v-for="theme in availableThemes"
          :key="theme"
          :class="[
            'px-3 py-2 sm:py-1 text-sm rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0',
            selectedTheme === theme
              ? 'bg-purple-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
          ]"
          @click="selectedTheme = theme"
        >
          {{ theme }}
        </button>
      </div>

      <!-- Quick Add Task Input -->
      <div
        class="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4"
      >
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <Icon
              name="mdi:plus-circle"
              size="24"
              class="text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <input
              ref="quickTaskInput"
              v-model="quickTaskTitle"
              type="text"
              placeholder="Quick add a task for today (Press Enter to add)..."
              class="flex-1 px-3 py-2.5 sm:py-2 border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base sm:text-lg"
              @keyup.enter="handleQuickAddTask"
              @keyup.esc="handleQuickTaskEsc"
              @focus="isAddingQuickTask = true"
              @blur="handleQuickTaskBlur"
            />
            <button
              v-if="quickTaskTitle.trim()"
              class="px-4 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex-shrink-0 touch-manipulation min-h-[44px] sm:min-h-0"
              title="Add task (Enter)"
              @click="handleQuickAddTask"
            >
              Add
            </button>
          </div>

          <!-- Theme and Date Selector -->
          <div class="flex items-center gap-2 ml-9 flex-wrap">
            <span class="text-sm text-gray-600 dark:text-gray-400">Theme:</span>
            <select
              v-model="quickTaskTheme"
              class="px-3 py-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option :value="null">None</option>
              <option v-for="theme in availableThemes" :key="theme" :value="theme">
                {{ theme }}
              </option>
            </select>
            <button
              class="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Add new theme"
              @click="isThemeInputVisible = !isThemeInputVisible"
            >
              <Icon name="mdi:plus" size="16" />
            </button>
            <div class="relative">
              <input
                v-if="isThemeInputVisible"
                v-model="newThemeName"
                type="text"
                placeholder="New theme name"
                class="px-2 py-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                @keyup.enter="addNewTheme"
                @keyup.esc="handleThemeInputEsc"
                @keydown="handleThemeInputKeydown"
                @input="selectedThemeSuggestionIndex = -1"
              />
              <!-- Theme Suggestions Dropdown -->
              <div
                v-if="isThemeInputVisible && themeSuggestions.length > 0 && newThemeName.trim()"
                ref="themeSuggestionsRef"
                class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[150px]"
                style="left: 0; top: 100%"
              >
                <div
                  v-for="(suggestion, index) in themeSuggestions"
                  :key="suggestion"
                  :class="[
                    'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm',
                    index === selectedThemeSuggestionIndex ? 'bg-blue-100 dark:bg-blue-900/40' : '',
                  ]"
                  @click="selectThemeSuggestion(suggestion)"
                >
                  <div class="font-medium text-gray-900 dark:text-gray-100">{{ suggestion }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Existing category</div>
                </div>
              </div>
            </div>
            <span class="text-sm text-gray-600 dark:text-gray-400 ml-2">Date:</span>
            <input
              v-model="quickTaskDate"
              type="date"
              class="px-3 py-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
        </div>
        <p v-if="!isAddingQuickTask" class="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-9">
          Click here or start typing to add a task quickly
        </p>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
      ></div>
    </div>

    <div v-else class="space-y-6">
      <!-- Empty state message -->
      <div
        v-if="tasksWithDates.length === 0 && !isLoading"
        class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center"
      >
        <Icon
          name="mdi:calendar-plus"
          size="48"
          class="mx-auto mb-4 text-blue-500 dark:text-blue-400"
        />
        <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
          No tasks with due dates
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Add tasks with due dates using the quick-add input above, or set a planned date when
          creating tasks.
        </p>
      </div>

      <!-- Tasks grouped by date -->
      <div v-else class="space-y-8">
        <div
          v-for="dateGroup in filteredTasksByDate"
          :key="dateGroup.date"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          <div
            class="bg-gray-100 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600"
          >
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatDate(dateGroup.date) }}
            </h2>
          </div>

          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TaskColumn
                title="Today"
                status="today"
                :tasks="getTasksByStatus(dateGroup.tasks).today"
                @update="handleTaskUpdate"
                @delete="handleTaskDelete"
              />
              <TaskColumn
                title="Doing"
                status="doing"
                :tasks="getTasksByStatus(dateGroup.tasks).doing"
                @update="handleTaskUpdate"
                @delete="handleTaskDelete"
              />
              <TaskColumn
                title="Done"
                status="done"
                :tasks="getTasksByStatus(dateGroup.tasks).done"
                @update="handleTaskUpdate"
                @delete="handleTaskDelete"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
