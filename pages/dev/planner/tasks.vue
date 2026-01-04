<script setup lang="ts">
import { nextTick, onUnmounted } from 'vue'
import { useRuntimeConfig } from '#imports'
import type { Task, TaskStatus } from '~/server/api/planner/tasks.get'
import {
  formatDateToDisplay,
  formatDateRelative,
  getLocalDateString,
} from '~/utils/common/dateParser'
import { getAvailableTags, type TagInfo } from '~/utils/planner/eisenhower'
import { findSimilarStrings } from '~/utils/common/stringSimilarity'

definePageMeta({
  layout: 'default',
  middleware: 'auth-planner',
})

const { fetchTasks, fetchThemes, updateTask, deleteTask, createTask, purgeDeletedTasks } =
  useTasks()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const availableThemes = ref<string[]>([])
const sortBy = ref<'title' | 'status' | 'planned_date' | 'theme'>('planned_date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const dbConnectionStatus = ref<'connected' | 'disconnected' | 'checking'>('checking')

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

// Delete confirmation modal state
const showDeleteModal = ref(false)
const taskToDelete = ref<{ id: number; title: string } | null>(null)
const isPurging = ref(false)

// Menu and dropdown state
const showMobileMenu = ref(false)
const showExportMenu = ref(false)
const datePickerRef = ref<HTMLInputElement | null>(null)

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
  const tasksToUpdate: Array<{ id: number; planned_date: string }> = []

  // Create a deep copy of tasks to avoid mutating the original array
  // This ensures comparison in loadData works correctly
  const tasksCopy = tasksList.map((task) => ({ ...task }))

  tasksCopy.forEach((task) => {
    // Only roll over "doing" tasks with past dates
    // planned_date is now always in YYYY-MM-DD format from the API
    if (task.status === 'doing' && task.planned_date) {
      // Use string comparison for dates in YYYY-MM-DD format (more reliable than Date comparison)
      // This will catch any date before today
      if (task.planned_date < today) {
        // Task has a past date, update it to today
        tasksToUpdate.push({
          id: task.id,
          planned_date: today,
        })
      }
    }
  })

  if (tasksToUpdate.length > 0) {
    try {
      // Use batch update API for better performance
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || '/api'
      await $fetch(`${apiBase}/planner/tasks/batch-update`, {
        method: 'POST',
        body: { updates: tasksToUpdate },
      })
      // Update local state optimistically on the copy
      tasksCopy.forEach((task) => {
        if (tasksToUpdate.some((u) => u.id === task.id)) {
          task.planned_date = today
        }
      })
      return tasksCopy
    } catch (error) {
      console.error('Failed to roll over past dates:', error)
      // Fallback to individual updates if batch fails
      try {
        await Promise.all(
          tasksToUpdate.map((update) =>
            updateTask(update.id, {
              planned_date: update.planned_date,
            }),
          ),
        )
        // Update local state on the copy
        tasksCopy.forEach((task) => {
          if (tasksToUpdate.some((u) => u.id === task.id)) {
            task.planned_date = today
          }
        })
        return tasksCopy
      } catch (fallbackError) {
        console.error('Failed to roll over past dates (fallback):', fallbackError)
        return tasksList
      }
    }
  }

  return tasksCopy
}

// Connection status is updated based on data load success/failure, not periodic health checks

const loadData = async () => {
  isLoading.value = true
  try {
    // Load data in parallel for better performance
    const [allTasks, themes] = await Promise.all([fetchTasks(), fetchThemes()])

    // Update UI immediately with fetched data (optimistic update)
    availableThemes.value = themes

    // Sort tasks: done tasks to the end, then by planned_date (default sort)
    const sortedTasks = [...allTasks].sort((a, b) => {
      // First, sort by status: done tasks go to the end
      if (a.status === 'done' && b.status !== 'done') return 1
      if (a.status !== 'done' && b.status === 'done') return -1
      // Then sort by planned_date (default)
      const aDate = a.planned_date || ''
      const bDate = b.planned_date || ''
      return aDate.localeCompare(bDate)
    })
    tasks.value = sortedTasks

    // Update connection status on successful load
    dbConnectionStatus.value = 'connected'

    // Roll over past dates asynchronously (non-blocking)
    // This runs in the background and doesn't block the UI or exhaust connections
    // Store snapshots: one for rollover comparison (unsorted), one for user change detection (sorted)
    const originalTasksSnapshot = new Map(allTasks.map((t) => [t.id, { ...t }]))
    const sortedTasksSnapshot = new Map(tasks.value.map((t) => [t.id, { ...t }]))

    rollOverPastDates(allTasks)
      .then((updatedTasks) => {
        // Compare updatedTasks (from rollover of unsorted allTasks) against original unsorted snapshot
        // This ensures we're comparing unsorted to unsorted, detecting actual date changes
        const hasChanges = updatedTasks.some((task) => {
          const originalTask = originalTasksSnapshot.get(task.id)
          return originalTask && originalTask.planned_date !== (task.planned_date || null)
        })

        // Check if user has made changes by comparing current sorted tasks.value against sorted snapshot
        // This compares sorted to sorted, avoiding false positives from order differences
        const userHasChangedTasks = tasks.value.some((task) => {
          const snapshotTask = sortedTasksSnapshot.get(task.id)
          return (
            !snapshotTask ||
            snapshotTask.planned_date !== task.planned_date ||
            snapshotTask.status !== task.status ||
            snapshotTask.title !== task.title
          )
        })

        // Only update if no user changes detected and rollover made changes
        if (!userHasChangedTasks && hasChanges) {
          // Sort the updated tasks to match the UI sort order
          const sortedUpdated = [...updatedTasks].sort((a, b) => {
            if (a.status === 'done' && b.status !== 'done') return 1
            if (a.status !== 'done' && b.status === 'done') return -1
            const aDate = a.planned_date || ''
            const bDate = b.planned_date || ''
            return aDate.localeCompare(bDate)
          })
          tasks.value = sortedUpdated
        } else if (userHasChangedTasks) {
          // User has made changes - don't overwrite them
          console.debug('[Tasks] Skipping rollover update - user has modified tasks')
        }
      })
      .catch((error) => {
        // Silently fail - don't disrupt user experience
        console.debug('[Tasks] Background date rollover failed (non-critical):', error)
      })
  } catch (error) {
    console.error('Failed to load tasks:', error)
    // Update connection status on error
    dbConnectionStatus.value = 'disconnected'
    // Show error but don't crash - keep existing data if available
  } finally {
    isLoading.value = false
  }
}

const handleQuickTaskEsc = () => {
  quickTaskTitle.value = ''
  isAddingQuickTask.value = false
}

const handleThemeInputEsc = () => {
  isThemeInputVisible.value = false
  newThemeName.value = ''
  selectedThemeSuggestionIndex.value = -1
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

const openDeleteModal = (task: Task) => {
  taskToDelete.value = { id: task.id, title: task.title }
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  taskToDelete.value = null
}

const handleDelete = async (archive: boolean = false) => {
  if (!taskToDelete.value) return

  const id = taskToDelete.value.id

  try {
    await deleteTask(id, archive)
    tasks.value = tasks.value.filter((t) => t.id !== id)
    closeDeleteModal()
  } catch (error) {
    console.error('Failed to delete task:', error)
    alert('Failed to delete task. Please try again.')
  }
}

const handlePurge = async () => {
  if (
    !confirm(
      'Are you sure you want to permanently delete all tasks marked for deletion? This action cannot be undone.',
    )
  )
    return

  isPurging.value = true
  showMobileMenu.value = false
  try {
    const result = await purgeDeletedTasks()
    alert(`Successfully purged ${result.deletedCount} task(s)`)
    // Reload tasks to refresh the list
    await loadData()
  } catch (error) {
    console.error('Failed to purge tasks:', error)
    alert('Failed to purge tasks. Please try again.')
  } finally {
    isPurging.value = false
  }
}

const handleExportCSV = () => {
  showExportMenu.value = false
  showMobileMenu.value = false
  exportTasksReport()
}

const handlePrintReport = () => {
  showExportMenu.value = false
  showMobileMenu.value = false
  navigateTo(`/dev/planner/print/today?date=${getLocalDateString()}`)
}

const openDatePicker = () => {
  if (datePickerRef.value) {
    // Try showPicker() first (modern browsers), fallback to click()
    if (typeof datePickerRef.value.showPicker === 'function') {
      datePickerRef.value.showPicker()
    } else {
      datePickerRef.value.click()
    }
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

// Set up event listeners and cleanup at top level
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.menu-container')) {
    showMobileMenu.value = false
    showExportMenu.value = false
  }
}

const openBulkUploadModal = () => {
  isBulkUploadVisible.value = true
  showMobileMenu.value = false
}

onMounted(async () => {
  await loadData()
  // Focus quick input on mount for better UX
  await nextTick()
  quickTaskInput.value?.focus()

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <div class="flex-1">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Manage Tasks
            </h1>
            <!-- Database Connection Status Indicator -->
            <div
              :class="[
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                dbConnectionStatus === 'connected'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : dbConnectionStatus === 'disconnected'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
              ]"
              :title="
                dbConnectionStatus === 'connected'
                  ? 'Database connected'
                  : dbConnectionStatus === 'disconnected'
                    ? 'Database disconnected - attempting to reconnect...'
                    : 'Checking database connection...'
              "
            >
              <Icon
                :name="
                  dbConnectionStatus === 'connected'
                    ? 'mdi:database-check'
                    : dbConnectionStatus === 'disconnected'
                      ? 'mdi:database-off'
                      : 'mdi:database-sync'
                "
                size="14"
              />
              <span class="hidden sm:inline">
                {{
                  dbConnectionStatus === 'connected'
                    ? 'Connected'
                    : dbConnectionStatus === 'disconnected'
                      ? 'Reconnecting...'
                      : 'Checking...'
                }}
              </span>
            </div>
          </div>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            View and edit all your tasks
          </p>
        </div>
        <!-- Desktop: Large buttons with labels -->
        <div class="hidden sm:flex items-center gap-2 flex-wrap">
          <!-- Dashboard - moved to front -->
          <NuxtLink
            to="/dev/planner"
            class="px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center gap-2"
          >
            <Icon name="mdi:view-dashboard" size="20" />
            <span>Dashboard</span>
          </NuxtLink>
          <NuxtLink
            to="/dev/planner/review"
            class="px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors touch-manipulation flex items-center justify-center gap-2"
          >
            <Icon name="mdi:chart-line" size="20" />
            <span>Review</span>
          </NuxtLink>
          <!-- Export/Print - merged and moved to end -->
          <div class="relative menu-container">
            <button
              class="px-4 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors touch-manipulation flex items-center justify-center gap-2"
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
                @click="handleExportCSV"
              >
                <Icon name="mdi:download" size="20" />
                <span>Export CSV Report</span>
              </button>
              <button
                class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm border-t border-gray-200 dark:border-gray-700"
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
            <!-- Dashboard - moved to front -->
            <NuxtLink
              to="/dev/planner"
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="showMobileMenu = false"
            >
              <Icon name="mdi:view-dashboard" size="20" />
              <span>Dashboard</span>
            </NuxtLink>
            <button
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="handleExportCSV"
            >
              <Icon name="mdi:download" size="20" />
              <span>Export CSV Report</span>
            </button>
            <button
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="openBulkUploadModal"
            >
              <Icon name="mdi:upload" size="20" />
              <span>Bulk Upload</span>
            </button>
            <NuxtLink
              to="/dev/planner/review"
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="showMobileMenu = false"
            >
              <Icon name="mdi:chart-line" size="20" />
              <span>Review</span>
            </NuxtLink>
            <!-- Export/Print - merged and moved to end -->
            <button
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm border-b border-gray-200 dark:border-gray-700"
              @click="handleExportCSV"
            >
              <Icon name="mdi:download" size="20" />
              <span>Export CSV Report</span>
            </button>
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
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-3"
        >
          <!-- Main input row with Add button always visible -->
          <div class="flex items-center gap-2 mb-2">
            <input
              ref="quickTaskInput"
              v-model="quickTaskTitle"
              type="text"
              placeholder="Add task..."
              class="flex-1 px-3 py-2.5 sm:px-2 sm:py-1.5 text-base sm:text-sm border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              @keyup.enter="handleQuickAddTask"
              @keyup.esc="handleQuickTaskEsc"
              @focus="isAddingQuickTask = true"
            />
            <button
              v-if="quickTaskTitle.trim()"
              class="px-4 py-2.5 sm:px-2 sm:py-1 text-sm sm:text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0 flex-shrink-0"
              @click="handleQuickAddTask"
            >
              Add
            </button>
          </div>

          <!-- Options row (shown when focused or typing) -->
          <div
            v-if="isAddingQuickTask || quickTaskTitle.trim()"
            class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700"
          >
            <!-- Date Picker - Mobile friendly -->
            <div class="relative flex-1 sm:flex-initial">
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">
                Date
              </label>
              <div class="relative">
                <input
                  ref="datePickerRef"
                  v-model="quickTaskDate"
                  type="date"
                  class="w-full px-3 py-2.5 sm:px-2.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0 pr-10"
                  :class="{
                    'text-gray-400': !quickTaskDate,
                  }"
                />
                <button
                  v-if="!quickTaskDate"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation p-1"
                  @click="openDatePicker"
                >
                  <Icon name="mdi:calendar" size="20" />
                </button>
                <button
                  v-else
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation p-1"
                  @click="quickTaskDate = null"
                >
                  <Icon name="mdi:close-circle" size="20" />
                </button>
              </div>
            </div>
            <select
              v-model="quickTaskTheme"
              class="px-2.5 py-2 sm:px-1.5 sm:py-1 text-sm sm:text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0"
              title="Bucket"
            >
              <option :value="null">Bucket</option>
              <option v-for="theme in availableThemes" :key="theme" :value="theme">
                {{ theme }}
              </option>
            </select>
            <button
              class="p-2 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              title="New bucket"
              @click="isThemeInputVisible = !isThemeInputVisible"
            >
              <Icon name="mdi:plus" size="18" class="sm:w-3.5 sm:h-3.5" />
            </button>
            <div class="relative">
              <input
                v-if="isThemeInputVisible"
                v-model="newThemeName"
                type="text"
                placeholder="Bucket"
                class="px-2.5 py-2 sm:px-1.5 sm:py-1 text-sm sm:text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 w-24 sm:w-20 min-h-[44px] sm:min-h-0"
                @keyup.enter="addNewTheme"
                @keyup.esc="handleThemeInputEsc"
                @keydown="handleThemeInputKeydown"
                @input="selectedThemeSuggestionIndex = -1"
              />
              <!-- Theme Suggestions Dropdown -->
              <div
                v-if="isThemeInputVisible && themeSuggestions.length > 0 && newThemeName.trim()"
                ref="themeSuggestionsRef"
                class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[120px]"
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
            <button
              :class="[
                'px-3 py-2 sm:px-1.5 sm:py-1 text-sm sm:text-xs rounded border transition-colors touch-manipulation min-h-[44px] sm:min-h-0',
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
        </div>
      </div>

      <!-- Tasks List -->
      <div class="relative">
        <!-- Action Buttons - Icons overhead the tasks table -->
        <div class="flex justify-end gap-2 mb-2">
          <!-- Bulk Upload Button -->
          <button
            class="p-2 rounded-lg transition-colors touch-manipulation bg-blue-500 hover:bg-blue-600 text-white"
            title="Bulk upload tasks"
            @click="isBulkUploadVisible = true"
          >
            <Icon name="mdi:upload" size="22" />
          </button>
          <!-- Purge Button -->
          <button
            :class="[
              'p-2 rounded-lg transition-colors touch-manipulation',
              isPurging
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white',
            ]"
            :disabled="isPurging"
            :title="isPurging ? 'Purging...' : 'Purge all deleted tasks'"
            @click="handlePurge"
          >
            <Icon name="mdi:delete-sweep" size="22" />
          </button>
        </div>
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <template v-for="themeGroup in tasksGroupedByTheme" :key="themeGroup.theme">
            <!-- Theme Header -->
            <div
              class="bg-gray-100 dark:bg-gray-700/50 px-3 sm:px-4 py-2.5 border-l-4 border-gray-400 dark:border-gray-500"
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
                'px-3 sm:px-4 py-3 sm:py-2.5 border-l-4 transition-all',
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
              <div
                v-if="editingTaskId !== task.id"
                class="flex items-start sm:items-center gap-3 text-sm sm:text-xs py-1"
              >
                <!-- Done/Doing Toggle (square toggle) -->
                <button
                  :class="[
                    'relative w-11 h-6 sm:w-8 sm:h-4 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 touch-manipulation flex-shrink-0 mt-0.5 sm:mt-0',
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
                      'absolute top-0.5 left-0.5 h-5 w-5 sm:h-3 sm:w-3 bg-white shadow-sm transform transition-transform duration-200 rounded-sm',
                      task.status === 'done' ? 'translate-x-5 sm:translate-x-3.5' : 'translate-x-0',
                    ]"
                  ></span>
                </button>

                <!-- Title (clickable to edit) -->
                <div class="flex-1 min-w-0">
                  <div
                    :class="[
                      'font-medium break-words cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 py-2 sm:px-1 sm:py-0.5 rounded transition-colors touch-manipulation',
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
                    class="text-sm sm:text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0.5 px-2 sm:px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors break-words touch-manipulation"
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
                    class="px-2.5 py-1.5 sm:px-2 sm:py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation whitespace-nowrap"
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
                    class="p-2 sm:p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Delete"
                    @click.stop="openDeleteModal(task)"
                  >
                    <Icon name="mdi:delete-outline" size="22" class="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>

              <!-- Edit Mode -->
              <div v-else class="space-y-3 sm:space-y-2 py-3 sm:py-2 relative">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <input
                    v-model="editForm.title"
                    type="text"
                    class="flex-1 px-3 py-2.5 sm:px-2 sm:py-1 text-base sm:text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-h-[44px] sm:min-h-0"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                  />
                  <div class="flex gap-2">
                    <button
                      class="px-4 py-2.5 sm:px-3 sm:py-1 text-sm sm:text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
                      @click="saveEdit"
                    >
                      Save
                    </button>
                    <button
                      class="px-4 py-2.5 sm:px-3 sm:py-1 text-sm sm:text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
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
                    class="px-3 py-2.5 sm:px-2 sm:py-1 text-sm sm:text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-h-[44px] sm:min-h-0"
                  />
                  <select
                    v-model="editForm.theme"
                    class="px-3 py-2.5 sm:px-2 sm:py-1 text-sm sm:text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-h-[44px] sm:min-h-0"
                  >
                    <option :value="null">No Bucket</option>
                    <option v-for="theme in availableThemes" :key="theme" :value="theme">
                      {{ theme }}
                    </option>
                  </select>
                  <label
                    class="flex items-center gap-2 text-sm sm:text-xs text-gray-700 dark:text-gray-300 touch-manipulation min-h-[44px] sm:min-h-0 cursor-pointer"
                  >
                    <input
                      v-model="editForm.is_mit"
                      type="checkbox"
                      class="w-5 h-5 sm:w-3 sm:h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span>MIT</span>
                  </label>
                </div>
                <!-- Notes in Edit Mode -->
                <div class="mt-2">
                  <div class="flex items-center justify-between mb-2">
                    <label
                      class="block text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-300"
                      >Notes</label
                    >
                    <button
                      type="button"
                      class="text-sm sm:text-xs text-blue-600 dark:text-blue-400 hover:underline touch-manipulation py-2 px-1"
                      @click="showTagLegend = !showTagLegend"
                    >
                      {{ showTagLegend ? 'Hide' : 'Show' }} Tags Legend
                    </button>
                  </div>
                  <textarea
                    ref="notesInputRef"
                    v-model="editForm.notes"
                    class="w-full px-3 py-2.5 sm:px-2 sm:py-1 text-base sm:text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    rows="4"
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
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'time-effort',
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
            >Done tasks are automatically removed after 1 day. Use the purge icon above to remove
            deleted tasks immediately. Archived tasks are preserved for statistics and can be viewed
            in the
            <NuxtLink to="/dev/planner/review" class="underline font-medium">Review page</NuxtLink
            >.</span
          >
        </div>
      </div>
    </div>

    <!-- Bulk Upload Modal -->
    <div
      v-if="isBulkUploadVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="isBulkUploadVisible = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md mx-4 border border-gray-200 dark:border-gray-700 shadow-xl w-full"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Bulk Upload Tasks</h2>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation"
            @click="isBulkUploadVisible = false"
          >
            <Icon name="mdi:close" size="20" />
          </button>
        </div>

        <div class="space-y-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV File
            </label>
            <input
              ref="bulkUploadInput"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleBulkUpload"
            />
            <button
              class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors touch-manipulation flex items-center justify-center gap-2 text-sm font-medium"
              @click="bulkUploadInput?.click()"
            >
              <Icon name="mdi:file-upload" size="18" />
              <span>Choose File</span>
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CSV Format
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Required columns:
              <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">title,date,theme,mit</code>
            </p>
            <button
              class="w-full px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center gap-2 text-sm font-medium"
              @click="downloadBulkTemplate"
            >
              <Icon name="mdi:download" size="18" />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        <button
          class="w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation"
          @click="isBulkUploadVisible = false"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="closeDeleteModal"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5 max-w-sm mx-4 border border-gray-200 dark:border-gray-700 shadow-xl"
      >
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Task</h2>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="closeDeleteModal"
          >
            <Icon name="mdi:close" size="20" />
          </button>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {{ taskToDelete?.title }}
        </p>

        <div class="space-y-2 mb-4">
          <button
            class="w-full px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation flex items-center gap-2 text-sm"
            @click="handleDelete(true)"
          >
            <Icon name="mdi:check-circle" size="18" />
            <span class="font-medium">Close Task and Delete</span>
          </button>

          <button
            class="w-full px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors touch-manipulation flex items-center gap-2 text-sm"
            @click="handleDelete(false)"
          >
            <Icon name="mdi:delete" size="18" />
            <span class="font-medium">Delete Only</span>
          </button>
        </div>

        <button
          class="w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation"
          @click="closeDeleteModal"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
