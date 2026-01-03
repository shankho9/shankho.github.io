<script setup lang="ts">
import { nextTick } from 'vue'
import type { Task, TaskStatus } from '~/server/api/planner/tasks.get'
import {
  formatDateToDisplay,
  formatDateRelative,
  getLocalDateString,
} from '~/utils/common/dateParser'
import { getAvailableTags, type TagInfo } from '~/utils/planner/eisenhower'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { fetchTasks, fetchThemes, updateTask, deleteTask, createTask } = useTasks()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const availableThemes = ref<string[]>([])
const sortBy = ref<'title' | 'status' | 'planned_date' | 'theme'>('planned_date')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Quick Add Task
const quickTaskTitle = ref('')
const quickTaskTheme = ref<string | null>(null)
const quickTaskDate = ref<string | null>(null)
const quickTaskIsMit = ref(false)
const isAddingQuickTask = ref(false)
const isThemeInputVisible = ref(false)
const newThemeName = ref('')
const quickTaskInput = ref<HTMLInputElement | null>(null)

// Tag suggestions and legend
const availableTags = getAvailableTags()
const showTagLegend = ref(false)
const tagSuggestions = ref<TagInfo[]>([])
const suggestionIndex = ref(-1)
const notesInputRef = ref<HTMLTextAreaElement | null>(null)
const tagSuggestionsRef = ref<HTMLDivElement | null>(null)

// Bulk Upload
const isBulkUploadVisible = ref(false)
const bulkUploadFile = ref<File | null>(null)
const bulkUploadInput = ref<HTMLInputElement | null>(null)

// Editing state
const editingTaskId = ref<number | null>(null)
const editForm = ref<{
  title: string
  status: TaskStatus
  is_mit: boolean
  theme: string | null
  planned_date: string | null
  notes: string | null
}>({
  title: '',
  status: 'doing',
  is_mit: false,
  theme: null,
  planned_date: null,
  notes: null,
})

const filteredAndSortedTasks = computed(() => {
  let filtered = tasks.value

  // Filter out done tasks older than 1 day (based on today's date - if planned_date is more than 1 day in the past)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneDayAgo = new Date(today)
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  filtered = filtered.filter((task) => {
    if (task.status === 'done') {
      // For done tasks, hide if planned_date is more than 1 day in the past
      // planned_date is now always in YYYY-MM-DD format from the API
      if (task.planned_date) {
        const taskDate = new Date(task.planned_date + 'T00:00:00')
        if (!isNaN(taskDate.getTime())) {
          taskDate.setHours(0, 0, 0, 0)
          // Hide if task date is more than 1 day ago
          if (taskDate < oneDayAgo) {
            return false
          }
        }
      }
    }
    return true
  })

  // Sort - only by selected sort field, not by status (status sorting happens on reload)
  filtered = [...filtered].sort((a, b) => {
    let aVal: string | number | null
    let bVal: string | number | null

    switch (sortBy.value) {
      case 'title':
        aVal = a.title.toLowerCase()
        bVal = b.title.toLowerCase()
        break
      case 'status':
        aVal = a.status
        bVal = b.status
        break
      case 'planned_date':
        // Sort by actual date value (YYYY-MM-DD format) for proper chronological sorting
        aVal = a.planned_date || ''
        bVal = b.planned_date || ''
        break
      case 'theme':
        aVal = a.theme || ''
        bVal = b.theme || ''
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return filtered
})

const tasksGroupedByTheme = computed(() => {
  const grouped = new Map<string, Task[]>()

  filteredAndSortedTasks.value.forEach((task) => {
    const theme = task.theme || 'No Bucket'
    if (!grouped.has(theme)) {
      grouped.set(theme, [])
    }
    grouped.get(theme)!.push(task)
  })

  // Convert to array and sort by bucket name (No Bucket comes last)
  return Array.from(grouped.entries())
    .map(([theme, tasks]) => ({ theme, tasks }))
    .sort((a, b) => {
      if (a.theme === 'No Bucket') return 1
      if (b.theme === 'No Bucket') return -1
      return a.theme.localeCompare(b.theme)
    })
})

const rollOverPastDates = async (tasksList: Task[]) => {
  const today = getLocalDateString()
  const tasksToUpdate: Promise<Task>[] = []

  tasksList.forEach((task) => {
    // Only roll over "doing" tasks with past dates
    // planned_date is now always in YYYY-MM-DD format from the API
    if (task.status === 'doing' && task.planned_date) {
      // Use string comparison for dates in YYYY-MM-DD format (more reliable than Date comparison)
      // This will catch any date before today
      if (task.planned_date < today) {
        // Task has a past date, update it to today
        tasksToUpdate.push(
          updateTask(task.id, {
            planned_date: today,
          }),
        )
      }
    }
  })

  if (tasksToUpdate.length > 0) {
    try {
      await Promise.all(tasksToUpdate)
      // Reload tasks after updates to ensure we have the latest data from database
      return await fetchTasks()
    } catch (error) {
      console.error('Failed to roll over past dates:', error)
      return tasksList
    }
  }

  return tasksList
}

const loadData = async () => {
  isLoading.value = true
  try {
    const [allTasks, themes] = await Promise.all([fetchTasks(), fetchThemes()])
    // Roll over past dates for doing tasks
    const updatedTasks = await rollOverPastDates(allTasks)
    // Sort tasks: done tasks to the end, then by planned_date (default sort)
    const sortedTasks = [...updatedTasks].sort((a, b) => {
      // First, sort by status: done tasks go to the end
      if (a.status === 'done' && b.status !== 'done') return 1
      if (a.status !== 'done' && b.status === 'done') return -1
      // Then sort by planned_date (default)
      const aDate = a.planned_date || ''
      const bDate = b.planned_date || ''
      return aDate.localeCompare(bDate)
    })
    tasks.value = sortedTasks
    availableThemes.value = themes
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    isLoading.value = false
  }
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
      status: 'doing', // All new tasks default to 'doing'
      is_mit: quickTaskIsMit.value,
      planned_date: quickTaskDate.value || null,
      theme: theme,
    })

    // Add to tasks list immediately (optimistic update)
    tasks.value.push(newTask)

    // Only reload themes if a new theme was added
    if (newThemeName.value.trim() && !availableThemes.value.includes(newThemeName.value.trim())) {
      availableThemes.value.push(newThemeName.value.trim())
    }

    // Reset form
    quickTaskTitle.value = ''
    quickTaskTheme.value = null
    quickTaskDate.value = null
    quickTaskIsMit.value = false
    newThemeName.value = ''
    isAddingQuickTask.value = false
    isThemeInputVisible.value = false
  } catch (error) {
    console.error('Failed to create task:', error)
    // On error, reload data to ensure consistency
    await loadData()
  }
}

const addNewTheme = () => {
  if (newThemeName.value.trim()) {
    const theme = newThemeName.value.trim()
    if (!availableThemes.value.includes(theme)) {
      quickTaskTheme.value = theme
      newThemeName.value = ''
      isThemeInputVisible.value = false
    }
  }
}

const startEdit = (task: Task) => {
  editingTaskId.value = task.id

  // planned_date is now always in YYYY-MM-DD format from the API
  const plannedDate = task.planned_date || getLocalDateString()

  // Normalize old status values to 'doing' or 'done'
  const normalizedStatus: TaskStatus = task.status === 'done' ? 'done' : 'doing'

  editForm.value = {
    title: task.title,
    status: normalizedStatus,
    is_mit: task.is_mit,
    theme: task.theme || null,
    planned_date: plannedDate,
    notes: task.notes || null,
  }
}

const cancelEdit = () => {
  editingTaskId.value = null
  editForm.value = {
    title: '',
    status: 'doing',
    is_mit: false,
    theme: null,
    planned_date: null,
    notes: null,
  }
  tagSuggestions.value = []
  suggestionIndex.value = -1
  showTagLegend.value = false
}

// Handle notes input for tag suggestions
const handleNotesInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const cursorPos = target.selectionStart
  const textBeforeCursor = editForm.value.notes?.substring(0, cursorPos) || ''

  // Check if we're typing a tag (after @ or #)
  const match = textBeforeCursor.match(/[@#]([a-z-]*)$/i)

  if (match) {
    const query = match[1].toLowerCase()
    // Filter tags that match the query
    tagSuggestions.value = availableTags.filter(
      (tagInfo) =>
        tagInfo.tag.toLowerCase().includes(query) ||
        tagInfo.description.toLowerCase().includes(query),
    )
    suggestionIndex.value = -1
  } else {
    tagSuggestions.value = []
    suggestionIndex.value = -1
  }
}

// Handle keyboard navigation in tag suggestions
const handleNotesKeydown = (event: KeyboardEvent) => {
  if (tagSuggestions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    suggestionIndex.value = (suggestionIndex.value + 1) % tagSuggestions.value.length
    scrollSuggestionIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    suggestionIndex.value =
      suggestionIndex.value <= 0 ? tagSuggestions.value.length - 1 : suggestionIndex.value - 1
    scrollSuggestionIntoView()
  } else if (event.key === 'Enter' && suggestionIndex.value >= 0) {
    event.preventDefault()
    insertTag(tagSuggestions.value[suggestionIndex.value].tag)
  } else if (event.key === 'Escape') {
    tagSuggestions.value = []
    suggestionIndex.value = -1
  }
}

// Scroll the selected suggestion into view
const scrollSuggestionIntoView = () => {
  if (!tagSuggestionsRef.value || suggestionIndex.value < 0) return

  nextTick(() => {
    const suggestionElements = tagSuggestionsRef.value?.querySelectorAll('[data-suggestion-index]')
    const selectedElement = suggestionElements?.[suggestionIndex.value] as HTMLElement

    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  })
}

// Insert tag into notes at cursor position
const insertTag = (tag: string) => {
  if (!notesInputRef.value) return

  const textarea = notesInputRef.value
  const cursorPos = textarea.selectionStart
  const text = editForm.value.notes || ''
  const textBeforeCursor = text.substring(0, cursorPos)
  const textAfterCursor = text.substring(cursorPos)

  // Find the @ or # that started the tag
  const match = textBeforeCursor.match(/[@#][a-z-]*$/i)
  if (match) {
    const startPos = cursorPos - match[0].length
    const newText = text.substring(0, startPos) + tag + ' ' + textAfterCursor
    editForm.value.notes = newText

    // Set cursor position after the inserted tag
    nextTick(() => {
      const newCursorPos = startPos + tag.length + 1
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    })
  }

  tagSuggestions.value = []
  suggestionIndex.value = -1
}

const saveEdit = async () => {
  if (!editingTaskId.value || !editForm.value.title.trim()) return

  try {
    const updated = await updateTask(editingTaskId.value, {
      title: editForm.value.title.trim(),
      status: editForm.value.status,
      is_mit: editForm.value.is_mit,
      theme: editForm.value.theme || null,
      planned_date: editForm.value.planned_date || null, // Already in YYYY-MM-DD format from date picker
      notes: editForm.value.notes || null,
    })

    // Update the task in local state immediately
    const index = tasks.value.findIndex((t) => t.id === updated.id)
    if (index !== -1) {
      tasks.value[index] = updated
    }

    // Update themes list if a new theme was added
    if (updated.theme && !availableThemes.value.includes(updated.theme)) {
      availableThemes.value.push(updated.theme)
    }

    cancelEdit()
  } catch (error) {
    console.error('Failed to update task:', error)
    // On error, reload data to ensure consistency
    await loadData()
  }
}

const updateTaskStatus = async (id: number, newStatus: TaskStatus) => {
  try {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    // Normalize status to 'doing' or 'done'
    const normalizedStatus: TaskStatus = newStatus === 'done' ? 'done' : 'doing'

    const updated = await updateTask(id, {
      status: normalizedStatus,
    })

    const index = tasks.value.findIndex((t) => t.id === updated.id)
    if (index !== -1) {
      tasks.value[index] = updated
    }
  } catch (error) {
    console.error('Failed to update task status:', error)
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('Are you sure you want to delete this task?')) return

  try {
    await deleteTask(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

const downloadBulkTemplate = () => {
  const template = [
    { title: 'Task 1', date: getLocalDateString(), theme: 'Work', mit: false },
    { title: 'Task 2', date: getLocalDateString(), theme: 'Personal', mit: true },
  ]
  const csv = [
    'title,date,theme,mit',
    ...template.map((t) => `${t.title},${t.date},${t.theme},${t.mit}`),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tasks_template.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

const exportTasksReport = async () => {
  try {
    // Fetch all tasks (including done tasks older than 1 day)
    const allTasks = await fetchTasks()

    // Create pivot-friendly CSV with all task data
    const headers = [
      'ID',
      'Title',
      'Status',
      'MIT',
      'Bucket',
      'Planned Date',
      'Notes',
      'Created At',
      'Updated At',
    ]

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCsv = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = allTasks.map((task) =>
      [
        task.id,
        task.title,
        task.status,
        task.is_mit ? 'Yes' : 'No',
        task.theme || '',
        task.planned_date || '',
        task.notes || '',
        task.created_at || '',
        task.updated_at || '',
      ]
        .map(escapeCsv)
        .join(','),
    )

    const csv = [headers.join(','), ...rows].join('\n')

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = getLocalDateString()
    a.href = url
    a.download = `tasks_report_${dateStr}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export tasks:', error)
    alert('Failed to export tasks. Please try again.')
  }
}

const handleBulkUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      alert('CSV file must have a header row and at least one task')
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const titleIdx = headers.indexOf('title')
    const dateIdx = headers.indexOf('date')
    const themeIdx = headers.indexOf('theme')
    const mitIdx = headers.indexOf('mit')

    if (titleIdx === -1) {
      alert('CSV file must have a "title" column')
      return
    }

    const tasksToCreate: Array<{
      title: string
      planned_date: string | null
      theme: string | null
      is_mit: boolean
    }> = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      const title = values[titleIdx]
      if (!title) continue

      const date = dateIdx !== -1 ? values[dateIdx] || null : null
      const theme = themeIdx !== -1 ? values[themeIdx] || null : null
      const mit = mitIdx !== -1 ? values[mitIdx].toLowerCase() === 'true' : false

      tasksToCreate.push({
        title,
        planned_date: date || null,
        theme: theme || null,
        is_mit: mit,
      })
    }

    // Create tasks
    for (const taskData of tasksToCreate) {
      await createTask({
        title: taskData.title,
        status: 'doing',
        is_mit: taskData.is_mit,
        planned_date: taskData.planned_date,
        theme: taskData.theme,
      })
    }

    // Reload data
    await loadData()
    isBulkUploadVisible.value = false
    bulkUploadFile.value = null
    if (bulkUploadInput.value) bulkUploadInput.value.value = ''

    alert(`Successfully created ${tasksToCreate.length} task(s)`)
  } catch (error) {
    console.error('Failed to upload tasks:', error)
    alert('Failed to upload tasks. Please check the file format.')
  }
}

onMounted(async () => {
  await loadData()
  // Focus quick input on mount for better UX
  await nextTick()
  quickTaskInput.value?.focus()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Tasks</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">View and edit all your tasks</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            title="Export Report"
            @click="exportTasksReport"
          >
            <Icon name="mdi:download" size="20" />
          </button>
          <NuxtLink
            to="/dev/planner"
            class="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Dashboard"
          >
            <Icon name="mdi:view-dashboard" size="20" />
          </NuxtLink>
          <NuxtLink
            to="/dev/planner/review"
            class="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            title="Review"
          >
            <Icon name="mdi:chart-line" size="20" />
          </NuxtLink>
          <NuxtLink
            :to="`/dev/planner/print/today?date=${getLocalDateString()}`"
            class="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            title="Print Daily Plan"
          >
            <Icon name="mdi:printer" size="20" />
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

    <div v-else>
      <!-- Quick Add Task Section -->
      <div class="mb-4">
        <div
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
        >
          <div class="flex items-center gap-2">
            <input
              ref="quickTaskInput"
              v-model="quickTaskTitle"
              type="text"
              placeholder="Add task..."
              class="flex-1 px-2 py-1.5 text-sm border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              @keyup.enter="handleQuickAddTask"
              @keyup.esc="
                quickTaskTitle = ''
                isAddingQuickTask = false
              "
              @focus="isAddingQuickTask = true"
            />

            <!-- Compact Options (always visible when focused or typing) -->
            <div
              v-if="isAddingQuickTask || quickTaskTitle.trim()"
              class="flex items-center gap-1.5"
            >
              <input
                v-model="quickTaskDate"
                type="date"
                class="px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                title="Date"
              />
              <select
                v-model="quickTaskTheme"
                class="px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                title="Bucket"
              >
                <option :value="null">Bucket</option>
                <option v-for="theme in availableThemes" :key="theme" :value="theme">
                  {{ theme }}
                </option>
              </select>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="New bucket"
                @click="isThemeInputVisible = !isThemeInputVisible"
              >
                <Icon name="mdi:plus" size="14" />
              </button>
              <input
                v-if="isThemeInputVisible"
                v-model="newThemeName"
                type="text"
                placeholder="Bucket"
                class="px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 w-20"
                @keyup.enter="addNewTheme"
                @keyup.esc="
                  isThemeInputVisible = false
                  newThemeName = ''
                "
              />
              <button
                :class="[
                  'px-1.5 py-1 text-xs rounded border transition-colors',
                  quickTaskIsMit
                    ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                    : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600',
                ]"
                title="MIT"
                @click="quickTaskIsMit = !quickTaskIsMit"
              >
                MIT
              </button>
            </div>

            <button
              v-if="quickTaskTitle.trim()"
              class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              @click="handleQuickAddTask"
            >
              Add
            </button>

            <button
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Bulk upload"
              @click="isBulkUploadVisible = !isBulkUploadVisible"
            >
              <Icon name="mdi:upload" size="14" class="inline" />
            </button>
          </div>

          <!-- Bulk Upload Section -->
          <div
            v-if="isBulkUploadVisible"
            class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2"
          >
            <input
              ref="bulkUploadInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleBulkUpload"
            />
            <button
              class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              @click="bulkUploadInput?.click()"
            >
              Choose File
            </button>
            <button
              class="px-2 py-1 text-xs bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              @click="downloadBulkTemplate"
            >
              <Icon name="mdi:download" size="14" class="inline mr-1" />
              Template
            </button>
            <span class="text-xs text-gray-500 dark:text-gray-400">CSV: title,date,theme,mit</span>
          </div>
        </div>
      </div>

      <!-- Tasks List -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      >
        <template v-for="themeGroup in tasksGroupedByTheme" :key="themeGroup.theme">
          <!-- Theme Header -->
          <div
            class="bg-gray-100 dark:bg-gray-700/50 px-4 py-2.5 border-l-4 border-gray-400 dark:border-gray-500"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                >{{ themeGroup.theme }}</span
              >
              <span class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{
                themeGroup.tasks.length
              }}</span>
            </div>
          </div>

          <!-- Tasks in this theme -->
          <div
            v-for="task in themeGroup.tasks"
            :key="task.id"
            :class="[
              'px-4 py-2.5 border-l-4 transition-all',
              editingTaskId === task.id &&
                'bg-blue-50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-600',
              task.is_mit &&
                editingTaskId !== task.id &&
                'bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-600 hover:bg-red-100 dark:hover:bg-red-950/50',
              !task.is_mit &&
                editingTaskId !== task.id &&
                'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30',
            ]"
          >
            <div v-if="editingTaskId !== task.id" class="flex items-center gap-3 text-xs py-1.5">
              <!-- Done/Doing Toggle (square toggle) -->
              <button
                :class="[
                  'relative w-8 h-4 rounded transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-offset-1',
                  task.status === 'done'
                    ? 'bg-green-500 dark:bg-green-600 focus:ring-green-500'
                    : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400',
                ]"
                @click="
                  async () => {
                    await updateTaskStatus(task.id, task.status === 'done' ? 'doing' : 'done')
                  }
                "
              >
                <span
                  :class="[
                    'absolute top-0.5 left-0.5 h-3 w-3 bg-white shadow-sm transform transition-transform duration-200',
                    task.status === 'done'
                      ? 'translate-x-3.5 rounded-sm'
                      : 'translate-x-0 rounded-sm',
                  ]"
                ></span>
              </button>

              <!-- Title (clickable to edit) -->
              <div class="flex-1 min-w-0">
                <div
                  :class="[
                    'font-medium truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-1 py-0.5 rounded transition-colors',
                    task.status === 'done'
                      ? 'text-gray-500 dark:text-gray-500 line-through'
                      : 'text-gray-900 dark:text-gray-100',
                  ]"
                  title="Click to edit"
                  @click="startEdit(task)"
                >
                  {{ task.title }}
                </div>
                <!-- Notes (small text below title) -->
                <div
                  v-if="task.notes"
                  class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors truncate"
                  title="Click to edit"
                  @click="startEdit(task)"
                >
                  {{ task.notes }}
                </div>
              </div>

              <!-- Tags: Date, Actions -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <!-- Date Tag (hidden for done tasks, clickable to edit) -->
                <span
                  v-if="task.planned_date && task.status !== 'done'"
                  class="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Click to edit"
                  @click="startEdit(task)"
                >
                  {{
                    formatDateRelative(task.planned_date) ||
                    formatDateToDisplay(task.planned_date) ||
                    task.planned_date
                  }}
                </span>

                <!-- Delete Icon -->
                <button
                  class="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  title="Delete"
                  @click.stop="handleDelete(task.id)"
                >
                  <Icon name="mdi:delete-outline" size="18" />
                </button>
              </div>
            </div>

            <!-- Edit Mode -->
            <div v-else class="space-y-2 py-2 relative">
              <div class="flex items-center gap-3">
                <input
                  v-model="editForm.title"
                  type="text"
                  class="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  @keyup.enter="saveEdit"
                  @keyup.esc="cancelEdit"
                />
                <div class="flex gap-2">
                  <button
                    class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    @click="saveEdit"
                  >
                    Save
                  </button>
                  <button
                    class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    @click="cancelEdit"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  v-model="editForm.planned_date"
                  type="date"
                  class="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
                <select
                  v-model="editForm.theme"
                  class="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option :value="null">No Bucket</option>
                  <option v-for="theme in availableThemes" :key="theme" :value="theme">
                    {{ theme }}
                  </option>
                </select>
                <label class="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    v-model="editForm.is_mit"
                    type="checkbox"
                    class="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  MIT
                </label>
              </div>
              <!-- Notes in Edit Mode -->
              <div class="mt-2">
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300"
                    >Notes</label
                  >
                  <button
                    type="button"
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    @click="showTagLegend = !showTagLegend"
                  >
                    {{ showTagLegend ? 'Hide' : 'Show' }} Tags Legend
                  </button>
                </div>
                <textarea
                  ref="notesInputRef"
                  v-model="editForm.notes"
                  class="w-full px-2 py-1 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  rows="2"
                  placeholder="Add notes... Use @ or # for tags (e.g., @delegate, @quick-win)"
                  @input="handleNotesInput"
                  @keydown="handleNotesKeydown"
                />
                <!-- Tag Suggestions Dropdown -->
                <div
                  v-if="tagSuggestions.length > 0"
                  ref="tagSuggestionsRef"
                  class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  style="width: calc(100% - 2rem); max-width: 400px"
                >
                  <div
                    v-for="(tagInfo, index) in tagSuggestions"
                    :key="tagInfo.tag"
                    :data-suggestion-index="index"
                    :class="[
                      'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs',
                      index === suggestionIndex ? 'bg-blue-100 dark:bg-blue-900/40' : '',
                    ]"
                    @click="insertTag(tagInfo.tag)"
                  >
                    <div class="font-medium text-gray-900 dark:text-gray-100">
                      {{ tagInfo.tag }}
                    </div>
                    <div class="text-gray-600 dark:text-gray-400 text-xs">
                      {{ tagInfo.description }}
                    </div>
                  </div>
                </div>
                <!-- Tag Legend -->
                <div
                  v-if="showTagLegend"
                  class="mt-2 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                >
                  <div class="font-semibold mb-2 text-gray-900 dark:text-gray-100 text-xs">
                    Available Tags:
                  </div>

                  <!-- Support Needed Tasks -->
                  <div class="mb-2.5">
                    <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1.5">
                      Support Needed:
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <div
                        v-for="tagInfo in availableTags.filter(
                          (t) => t.category === 'support-needed',
                        )"
                        :key="tagInfo.tag"
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"
                      >
                        <span
                          class="font-mono font-medium text-blue-600 dark:text-blue-400 text-xs"
                          >{{ tagInfo.tag }}</span
                        >
                        <span class="text-gray-600 dark:text-gray-400 text-xs">–</span>
                        <span class="text-gray-700 dark:text-gray-300 text-xs">{{
                          tagInfo.description
                        }}</span>
                        <span
                          :class="[
                            'px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                            tagInfo.quadrant === 'Q1'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : tagInfo.quadrant === 'Q2'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : tagInfo.quadrant === 'Q3'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  : tagInfo.quadrant === 'Q4'
                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                          ]"
                        >
                          {{ tagInfo.quadrant === 'any' ? 'Any' : tagInfo.quadrant }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Time/Effort Related Tasks -->
                  <div class="mb-2.5">
                    <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1.5">
                      Time/Effort:
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <div
                        v-for="tagInfo in availableTags.filter((t) => t.category === 'time-effort')"
                        :key="tagInfo.tag"
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"
                      >
                        <span
                          class="font-mono font-medium text-blue-600 dark:text-blue-400 text-xs"
                          >{{ tagInfo.tag }}</span
                        >
                        <span class="text-gray-600 dark:text-gray-400 text-xs">–</span>
                        <span class="text-gray-700 dark:text-gray-300 text-xs">{{
                          tagInfo.description
                        }}</span>
                        <span
                          :class="[
                            'px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                            tagInfo.quadrant === 'Q1'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : tagInfo.quadrant === 'Q2'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : tagInfo.quadrant === 'Q3'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  : tagInfo.quadrant === 'Q4'
                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                          ]"
                        >
                          {{ tagInfo.quadrant === 'any' ? 'Any' : tagInfo.quadrant }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Administrative Tasks -->
                  <div class="mb-0">
                    <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1.5">
                      Administrative:
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <div
                        v-for="tagInfo in availableTags.filter(
                          (t) => t.category === 'administrative',
                        )"
                        :key="tagInfo.tag"
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"
                      >
                        <span
                          class="font-mono font-medium text-blue-600 dark:text-blue-400 text-xs"
                          >{{ tagInfo.tag }}</span
                        >
                        <span class="text-gray-600 dark:text-gray-400 text-xs">–</span>
                        <span class="text-gray-700 dark:text-gray-300 text-xs">{{
                          tagInfo.description
                        }}</span>
                        <span
                          :class="[
                            'px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                            tagInfo.quadrant === 'Q1'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : tagInfo.quadrant === 'Q2'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : tagInfo.quadrant === 'Q3'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  : tagInfo.quadrant === 'Q4'
                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                          ]"
                        >
                          {{ tagInfo.quadrant === 'any' ? 'Any' : tagInfo.quadrant }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <div
          v-if="filteredAndSortedTasks.length === 0"
          class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          No tasks found
        </div>
      </div>

      <!-- Summary and Disclaimer -->
      <div class="mt-4 space-y-2">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          Showing {{ filteredAndSortedTasks.length }} task{{
            filteredAndSortedTasks.length !== 1 ? 's' : ''
          }}
        </div>
        <div
          class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
        >
          <Icon name="mdi:information-outline" size="16" class="inline align-middle mr-1" />
          <span
            >Done tasks are automatically removed from this board after 1 day. You can view and
            manage all done tasks in the
            <NuxtLink to="/dev/planner/review" class="underline font-medium">Review page</NuxtLink
            >.</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
