<script setup lang="ts">
import { nextTick, onUnmounted, onMounted } from 'vue'
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

const { fetchTasks, fetchThemes, updateTask, deleteTask, createTask } = useTasks()
const { showToast } = useToast()

const tasks = ref<Task[]>([])
const isLoading = ref(true) // Start as true to show loading state immediately
const availableThemes = ref<string[]>([])
const sortBy = ref<'title' | 'status' | 'planned_date' | 'theme'>('planned_date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const dbConnectionStatus = ref<'connected' | 'disconnected' | 'checking'>('checking')

// Date filter: All | Today | Tomorrow | Later
const dateFilter = ref<'all' | 'today' | 'tomorrow' | 'later'>('all')

// Quick Add Task
const quickTaskTitle = ref('')
const quickTaskTheme = ref<string | null>(null)
const quickTaskDate = ref<string | null>(null)
const quickTaskIsMit = ref(false)
const quickTaskNotes = ref<string | null>(null)
const quickTaskDependsOn = ref<number | null>(null)
const showQuickTaskDependencyDropdown = ref(false)
const isAddingQuickTask = ref(false)
const isThemeInputVisible = ref(false)
const newThemeName = ref('')
const selectedThemeSuggestionIndex = ref(-1)
const quickTaskInput = ref<HTMLInputElement | null>(null)
const quickTaskNotesInputRef = ref<HTMLTextAreaElement | null>(null)
const themeSuggestionsRef = ref<HTMLDivElement | null>(null)

// Edit form theme input
const isEditThemeInputVisible = ref(false)
const newEditThemeName = ref('')
const selectedEditThemeSuggestionIndex = ref(-1)
const editThemeSuggestionsRef = ref<HTMLDivElement | null>(null)

// Tag suggestions and legend
const availableTags = getAvailableTags()
const showTagLegendQuickAdd = ref(false) // For quick add mode only
const showTagLegendEdit = ref(false) // For edit mode only
const showTagLegendForTask = ref<Set<number>>(new Set()) // For view mode (per-task)
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
  depends_on_task_id: number | null
}>({
  title: '',
  status: 'doing',
  is_mit: false,
  theme: null,
  planned_date: null,
  notes: null,
  depends_on_task_id: null,
})

const showEditTaskDependencyDropdown = ref(false)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const taskToDelete = ref<{ id: number; title: string } | null>(null)
const isPurging = ref(false)

// Menu and dropdown state
const showExportMenu = ref(false)
const datePickerRef = ref<HTMLInputElement | null>(null)
const showThemeDropdown = ref(false)

// Collapsible dependent tasks state
const expandedParentTasks = ref<Set<number>>(new Set())
const toggleDependents = (taskId: number) => {
  if (expandedParentTasks.value.has(taskId)) {
    expandedParentTasks.value.delete(taskId)
  } else {
    expandedParentTasks.value.add(taskId)
  }
}

const filteredAndSortedTasks = computed(() => {
  let filtered = tasks.value

  // Date filter: Today, Tomorrow, or Later (tasks with no date or after tomorrow)
  if (dateFilter.value !== 'all') {
    const todayStr = getLocalDateString()
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowStr = getLocalDateString(tomorrowDate)
    filtered = filtered.filter((task) => {
      const pd = task.planned_date
      if (dateFilter.value === 'today') return pd === todayStr
      if (dateFilter.value === 'tomorrow') return pd === tomorrowStr
      if (dateFilter.value === 'later') return !pd || pd > tomorrowStr
      return true
    })
  }

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

// Helper to calculate dependency depth of a task (how many levels deep in the chain)
// Depth 0 = no parent, Depth 1 = has parent, Depth 2 = has grandparent
// If ignoreCurrentDependency is true, calculate depth as if the current task has no dependency (for editing)
const getDependencyDepth = (
  taskId: number,
  visited = new Set<number>(),
  ignoreCurrentDependency = false,
): number => {
  if (visited.has(taskId)) {
    // Circular dependency detected
    return 0
  }
  visited.add(taskId)

  const task = tasks.value.find((t) => t.id === taskId)
  if (!task) {
    return 0
  }

  // If we're ignoring the current dependency (for editing scenarios), return 0
  if (ignoreCurrentDependency) {
    return 0
  }

  if (!task.depends_on_task_id) {
    return 0
  }

  return 1 + getDependencyDepth(task.depends_on_task_id, visited, false)
}

// Helper to get dependent tasks for a parent task (sorted by date)
const getDependentTasks = (parentId: number): Task[] => {
  // Use tasks.value to include all tasks, not just filtered ones
  const dependents = tasks.value.filter((task) => task.depends_on_task_id === parentId)
  return dependents.sort((a, b) => {
    // Sort by date (earliest first)
    if (!a.planned_date && !b.planned_date) return 0
    if (!a.planned_date) return 1
    if (!b.planned_date) return -1
    return a.planned_date.localeCompare(b.planned_date)
  })
}

// Helper to check if a task has dependents
const hasDependents = (taskId: number): boolean => {
  // Use tasks.value to include all tasks, not just filtered ones
  return tasks.value.some((task) => task.depends_on_task_id === taskId)
}

// Dependents that pass the active filters (date, done/1-day). Used for display and hidden count
// so "(X dependent tasks hidden)" and the expanded list match: only filtered dependents are counted/shown.
const getFilteredDependentTasks = computed(() => {
  const ids = new Set(filteredAndSortedTasks.value.map((t) => t.id))
  return (parentId: number) => getDependentTasks(parentId).filter((d) => ids.has(d.id))
})

const tasksGroupedByTheme = computed(() => {
  const grouped = new Map<string, Task[]>()

  // Filter out dependent tasks - they will be shown under their parents
  const parentTasks = filteredAndSortedTasks.value.filter((task) => !task.depends_on_task_id)

  // Group by theme
  parentTasks.forEach((task) => {
    const theme = task.theme || 'No Bucket'
    if (!grouped.has(theme)) {
      grouped.set(theme, [])
    }
    grouped.get(theme)!.push(task)
  })

  // Convert to array, sort by bucket name (No Bucket comes last), and sort tasks within each group
  return Array.from(grouped.entries())
    .map(([theme, tasks]) => ({
      theme,
      tasks: tasks.sort((a, b) => {
        // First, prioritize tasks with dependents (parent tasks)
        const aHasDeps = hasDependents(a.id)
        const bHasDeps = hasDependents(b.id)
        if (aHasDeps && !bHasDeps) return -1
        if (!aHasDeps && bHasDeps) return 1

        // Then sort by date (earliest first)
        if (!a.planned_date && !b.planned_date) return 0
        if (!a.planned_date) return 1
        if (!b.planned_date) return -1
        return a.planned_date.localeCompare(b.planned_date)
      }),
    }))
    .sort((a, b) => {
      if (a.theme === 'No Bucket') return 1
      if (b.theme === 'No Bucket') return -1
      return a.theme.localeCompare(b.theme)
    })
})

// Count dependent tasks hidden because their parent is collapsed.
// Only counts dependents that pass the active filters so the "(X hidden)" text matches what
// will appear when the user expands.
const hiddenDependentCount = computed(() => {
  const getFiltered = getFilteredDependentTasks.value
  const parents = filteredAndSortedTasks.value.filter((t) => !t.depends_on_task_id)
  return parents
    .filter((p) => !expandedParentTasks.value.has(p.id))
    .reduce((sum, p) => sum + getFiltered(p.id).length, 0)
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

const loadData = async (silent: boolean = false) => {
  if (!silent) {
    isLoading.value = true
  }
  dbConnectionStatus.value = 'checking'

  // Add timeout to prevent hanging indefinitely
  // Store timeout ID so we can clean it up reliably
  let timeoutId: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Request timeout - database connection may be slow or unavailable')),
      30000,
    ) // 30 second timeout
  })

  try {
    // Load data in parallel for better performance with timeout
    const [allTasks, themes] = (await Promise.race([
      Promise.all([fetchTasks(), fetchThemes()]),
      timeoutPromise,
    ])) as [Task[], string[]]

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

    // Auto-expand all parent tasks with dependents (after tasks are set)
    await nextTick()
    // Check all tasks (including those that might be filtered) to find parents
    allTasks.forEach((task) => {
      // Check if this task has any dependents in the full task list
      const hasDeps = allTasks.some((t) => t.depends_on_task_id === task.id)
      if (hasDeps) {
        expandedParentTasks.value.add(task.id)
        // Also auto-expand level 1 dependents that have their own dependents (level 2)
        const level1Dependents = allTasks.filter((t) => t.depends_on_task_id === task.id)
        level1Dependents.forEach((level1Task) => {
          const hasLevel2Deps = allTasks.some((t) => t.depends_on_task_id === level1Task.id)
          if (hasLevel2Deps) {
            expandedParentTasks.value.add(level1Task.id)
          }
        })
      }
    })

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

    // Check if it's an auth error (401/403) or network error
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isAuthError =
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized')

    const isNetworkError =
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('fetch')

    // Update connection status on error
    if (isAuthError) {
      // Auth error - likely need to re-authenticate (serverless cold start)
      console.warn('[Tasks] Authentication error - redirecting to login')
      dbConnectionStatus.value = 'disconnected'
      // The middleware should handle redirect, but if we're here, try to navigate
      await navigateTo('/dev')
    } else if (isNetworkError || errorMessage.includes('timeout')) {
      // Network or timeout error - database connection issue
      dbConnectionStatus.value = 'disconnected'
      console.error('[Tasks] Database connection error:', errorMessage)
    } else {
      // Other error
      dbConnectionStatus.value = 'disconnected'
    }

    // Show error but don't crash - keep existing data if available
  } finally {
    // Always clean up timeout regardless of success or failure
    // This prevents race conditions where the timeout might fire after the promise resolves
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    // Always reset loading state, even for silent refreshes
    // This ensures the UI doesn't get stuck in a loading state
    // (isLoading might have been true from initialization or previous calls)
    isLoading.value = false
  }
}

const handleQuickTaskEsc = () => {
  quickTaskTitle.value = ''
  quickTaskNotes.value = null
  quickTaskTheme.value = null
  quickTaskDate.value = null
  quickTaskIsMit.value = false
  quickTaskDependsOn.value = null
  newThemeName.value = ''
  isAddingQuickTask.value = false
  isThemeInputVisible.value = false
  showQuickTaskDependencyDropdown.value = false
  tagSuggestions.value = []
  showTagLegendQuickAdd.value = false
}

const handleThemeInputEsc = () => {
  isThemeInputVisible.value = false
  newThemeName.value = ''
  showThemeDropdown.value = false
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
      notes: quickTaskNotes.value?.trim() || null,
      depends_on_task_id: quickTaskDependsOn.value,
    })

    // Add to tasks list immediately (optimistic update)
    tasks.value.push(newTask)

    // Only reload themes if a new theme was added
    if (newThemeName.value.trim() && !availableThemes.value.includes(newThemeName.value.trim())) {
      availableThemes.value.push(newThemeName.value.trim())
    }

    // If this is a dependent task, expand the parent task
    if (newTask.depends_on_task_id) {
      expandedParentTasks.value.add(newTask.depends_on_task_id)
      // Also check if the parent is a level 1 dependent and expand its parent too
      const parentTask = tasks.value.find((t) => t.id === newTask.depends_on_task_id)
      if (parentTask?.depends_on_task_id) {
        expandedParentTasks.value.add(parentTask.depends_on_task_id)
      }
    }

    // Reset form
    quickTaskTitle.value = ''
    quickTaskTheme.value = null
    quickTaskDate.value = null
    quickTaskIsMit.value = false
    quickTaskNotes.value = null
    quickTaskDependsOn.value = null
    newThemeName.value = ''
    isAddingQuickTask.value = false
    isThemeInputVisible.value = false
    showQuickTaskDependencyDropdown.value = false
  } catch (error) {
    console.error('Failed to create task:', error)
    // On error, reload data to ensure consistency
    await loadData()
  }
}

// Theme suggestions based on input
const themeSuggestions = computed(() => {
  if (!isThemeInputVisible.value) return []
  const input = newThemeName.value.trim().toLowerCase()
  if (!input) {
    return availableThemes.value.slice(0, 10)
  }
  const exactMatches = availableThemes.value.filter(
    (theme) => theme.toLowerCase() === input || theme.toLowerCase().startsWith(input),
  )
  const similarMatches = findSimilarStrings(newThemeName.value, availableThemes.value, {
    threshold: 0.3,
    maxResults: 10,
  })
  const combined = [...exactMatches]
  const exactMatchLower = exactMatches.map((t) => t.toLowerCase())
  for (const match of similarMatches) {
    if (!exactMatchLower.includes(match.toLowerCase())) {
      combined.push(match)
    }
  }
  return combined.slice(0, 10)
})

// Available tasks for dependency selection (only from same bucket, exclude done tasks, current task, and tasks that would create depth > 2)
const availableTasksForDependency = computed(() => {
  // For quick add: use quickTaskTheme (selected theme) or newThemeName if creating new theme
  // For edit: use editForm.theme, but if user is typing a new theme name, use that instead
  let currentTheme: string | null = null
  if (editingTaskId.value !== null) {
    // Editing mode: if user is typing a new theme, use that; otherwise use editForm.theme
    if (isEditThemeInputVisible.value && newEditThemeName.value.trim()) {
      currentTheme = newEditThemeName.value.trim()
    } else {
      currentTheme = editForm.value.theme
    }
  } else {
    // Quick add mode: use quickTaskTheme or newThemeName if creating new theme
    currentTheme = quickTaskTheme.value || newThemeName.value.trim() || null
  }

  // Only show dependency options if a bucket is chosen
  if (!currentTheme) return []

  // Get the current task being edited/created (if any)
  const currentTaskId = editingTaskId.value

  return tasks.value.filter((task) => {
    if (task.status === 'done') return false
    if (currentTaskId !== null && task.id === currentTaskId) return false
    // Only show tasks from the same bucket
    if (task.theme !== currentTheme) return false

    // Check if selecting this task as a dependency would create a chain deeper than 2 levels
    // Max depth is 2: Level 0 (no parent) -> Level 1 (has parent) -> Level 2 (has grandparent)
    // When editing, calculate depth as if current dependency is removed (we're changing it)
    const candidateTaskDepth = getDependencyDepth(task.id)

    // Calculate what the new depth would be: candidate depth + 1 (for the new link)
    const newDepth = candidateTaskDepth + 1

    // Allow if new depth would be <= 2
    if (newDepth > 2) return false

    // If editing a task that has dependents, check if changing its dependency would cause
    // any of its dependents to exceed depth 2 (matching backend validation)
    if (currentTaskId !== null) {
      const currentTaskDependents = getDependentTasks(currentTaskId)
      if (currentTaskDependents.length > 0) {
        // Current task has dependents - check if any would exceed depth 2
        // Calculate depth of current task with new dependency
        const currentTaskNewDepth = newDepth

        // Check each dependent's depth would be currentTaskNewDepth + 1
        // If any dependent would be at depth > 2, reject this candidate
        for (const _dependent of currentTaskDependents) {
          // Calculate dependent's depth: currentTaskNewDepth + 1
          const dependentDepth = currentTaskNewDepth + 1
          if (dependentDepth > 2) {
            // This candidate would cause a dependent to exceed max depth
            return false
          }
        }
      }
    }

    // Also check for circular dependency: candidate task (or its ancestors) shouldn't depend on current task
    if (currentTaskId !== null) {
      let checkTaskId = task.id
      const visited = new Set<number>([currentTaskId])
      while (checkTaskId !== null) {
        if (visited.has(checkTaskId)) {
          // Circular dependency detected
          return false
        }
        visited.add(checkTaskId)

        const checkTask = tasks.value.find((t) => t.id === checkTaskId)
        if (!checkTask || !checkTask.depends_on_task_id) {
          break
        }
        if (checkTask.depends_on_task_id === currentTaskId) {
          // Would create circular dependency
          return false
        }
        checkTaskId = checkTask.depends_on_task_id
      }
    }

    return true
  })
})

const getTaskById = (id: number | null): Task | undefined => {
  if (id === null) return undefined
  return tasks.value.find((t) => t.id === id)
}

const selectThemeSuggestion = (theme: string) => {
  quickTaskTheme.value = theme
  newThemeName.value = ''
  isThemeInputVisible.value = false
  showThemeDropdown.value = false
  selectedThemeSuggestionIndex.value = -1
}

const clearQuickTaskTheme = () => {
  quickTaskTheme.value = null
  showThemeDropdown.value = false
}

const selectQuickTaskTheme = (theme: string) => {
  quickTaskTheme.value = theme
  showThemeDropdown.value = false
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
      showThemeDropdown.value = false
      return
    }
    // Create new theme if no exact match
    quickTaskTheme.value = theme
    newThemeName.value = ''
    isThemeInputVisible.value = false
    showThemeDropdown.value = false
  }
}

const scrollThemeSuggestionIntoView = () => {
  if (selectedThemeSuggestionIndex.value >= 0 && themeSuggestionsRef.value) {
    const selectedElement = themeSuggestionsRef.value.querySelector(
      `[data-theme-suggestion-index="${selectedThemeSuggestionIndex.value}"]`,
    ) as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
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
    scrollThemeSuggestionIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedThemeSuggestionIndex.value = Math.max(selectedThemeSuggestionIndex.value - 1, -1)
    scrollThemeSuggestionIntoView()
  } else if (event.key === 'Enter' && selectedThemeSuggestionIndex.value >= 0) {
    event.preventDefault()
    selectThemeSuggestion(themeSuggestions.value[selectedThemeSuggestionIndex.value])
  } else if (event.key === 'Escape') {
    selectedThemeSuggestionIndex.value = -1
  }
}

// Edit form theme suggestions and handlers
const editThemeSuggestions = computed(() => {
  if (!isEditThemeInputVisible.value) return []
  const input = newEditThemeName.value.trim().toLowerCase()
  if (!input) {
    return availableThemes.value.slice(0, 10)
  }
  const exactMatches = availableThemes.value.filter(
    (theme) => theme.toLowerCase() === input || theme.toLowerCase().startsWith(input),
  )
  const similarMatches = findSimilarStrings(newEditThemeName.value, availableThemes.value, {
    threshold: 0.3,
    maxResults: 10,
  })
  const combined = [...exactMatches]
  const exactMatchLower = exactMatches.map((t) => t.toLowerCase())
  for (const match of similarMatches) {
    if (!exactMatchLower.includes(match.toLowerCase())) {
      combined.push(match)
    }
  }
  return combined.slice(0, 10)
})

const selectEditThemeSuggestion = (theme: string) => {
  editForm.value.theme = theme
  newEditThemeName.value = ''
  isEditThemeInputVisible.value = false
  selectedEditThemeSuggestionIndex.value = -1
}

const addNewEditTheme = () => {
  if (newEditThemeName.value.trim()) {
    const theme = newEditThemeName.value.trim()
    const exactMatch = availableThemes.value.find(
      (t) => t.toLowerCase().trim() === theme.toLowerCase().trim(),
    )
    if (exactMatch) {
      editForm.value.theme = exactMatch
    } else {
      editForm.value.theme = theme
      if (!availableThemes.value.includes(theme)) {
        availableThemes.value.push(theme)
      }
    }
    newEditThemeName.value = ''
    isEditThemeInputVisible.value = false
  }
}

const scrollEditThemeSuggestionIntoView = () => {
  if (selectedEditThemeSuggestionIndex.value >= 0 && editThemeSuggestionsRef.value) {
    const selectedElement = editThemeSuggestionsRef.value.querySelector(
      `[data-theme-suggestion-index="${selectedEditThemeSuggestionIndex.value}"]`,
    ) as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }
}

const handleEditThemeInputKeydown = (event: KeyboardEvent) => {
  if (editThemeSuggestions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedEditThemeSuggestionIndex.value = Math.min(
      selectedEditThemeSuggestionIndex.value + 1,
      editThemeSuggestions.value.length - 1,
    )
    scrollEditThemeSuggestionIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedEditThemeSuggestionIndex.value = Math.max(
      selectedEditThemeSuggestionIndex.value - 1,
      -1,
    )
    scrollEditThemeSuggestionIntoView()
  } else if (event.key === 'Enter' && selectedEditThemeSuggestionIndex.value >= 0) {
    event.preventDefault()
    selectEditThemeSuggestion(editThemeSuggestions.value[selectedEditThemeSuggestionIndex.value])
  } else if (event.key === 'Escape') {
    selectedEditThemeSuggestionIndex.value = -1
  }
}

const handleEditThemeInputEsc = () => {
  newEditThemeName.value = ''
  isEditThemeInputVisible.value = false
  selectedEditThemeSuggestionIndex.value = -1
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
    depends_on_task_id: task.depends_on_task_id || null,
  }
  newEditThemeName.value = ''
  isEditThemeInputVisible.value = false
  selectedEditThemeSuggestionIndex.value = -1
  // Show dependency dropdown if task has a dependency (so user can see the linked task)
  showEditTaskDependencyDropdown.value =
    task.depends_on_task_id !== null && task.depends_on_task_id !== undefined
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
    depends_on_task_id: null,
  }
  tagSuggestions.value = []
  suggestionIndex.value = -1
  showTagLegendEdit.value = false
  newEditThemeName.value = ''
  isEditThemeInputVisible.value = false
  selectedEditThemeSuggestionIndex.value = -1
  showEditTaskDependencyDropdown.value = false
}

// Handle notes input for tag suggestions (edit form)
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

// Handle notes input for tag suggestions (quick add form)
const handleQuickNotesInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const cursorPos = target.selectionStart
  const textBeforeCursor = quickTaskNotes.value?.substring(0, cursorPos) || ''

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

// Handle keyboard navigation in tag suggestions (edit form)
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

// Handle keyboard navigation in tag suggestions (quick add form)
const handleQuickNotesKeydown = (event: KeyboardEvent) => {
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
  // Determine which textarea is active (edit form or quick add form)
  // First check if either textarea is currently focused
  const quickAddFocused =
    quickTaskNotesInputRef.value && document.activeElement === quickTaskNotesInputRef.value
  const editFocused = notesInputRef.value && document.activeElement === notesInputRef.value

  // If neither is focused, determine based on which form is active
  // (editingTaskId indicates edit mode, otherwise assume quick add if available)
  let isQuickAdd: boolean
  let textarea: HTMLTextAreaElement | null

  if (quickAddFocused) {
    isQuickAdd = true
    textarea = quickTaskNotesInputRef.value
  } else if (editFocused) {
    isQuickAdd = false
    textarea = notesInputRef.value
  } else {
    // Neither is focused - determine based on form state
    // If we're in edit mode, use edit form; otherwise use quick add if available
    if (editingTaskId.value !== null && notesInputRef.value) {
      isQuickAdd = false
      textarea = notesInputRef.value
    } else if (quickTaskNotesInputRef.value) {
      isQuickAdd = true
      textarea = quickTaskNotesInputRef.value
    } else {
      // No valid textarea available - cannot insert tag
      return
    }
  }

  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const currentText = isQuickAdd ? quickTaskNotes.value || '' : editForm.value.notes || ''
  const textBeforeCursor = currentText.substring(0, cursorPos)
  const textAfterCursor = currentText.substring(cursorPos)

  // Find the @ or # that started the tag
  const match = textBeforeCursor.match(/[@#][a-z-]*$/i)
  if (match) {
    const startPos = cursorPos - match[0].length
    const newText = currentText.substring(0, startPos) + tag + ' ' + textAfterCursor

    if (isQuickAdd) {
      quickTaskNotes.value = newText
    } else {
      editForm.value.notes = newText
    }

    // Set cursor position after the inserted tag
    // Re-fetch textarea ref after reactive update to ensure we have the current DOM element
    // Re-evaluate which textarea to use based on current state (not stale state)
    // This prevents inserting tags into the wrong textarea if form context changes
    nextTick(() => {
      // Re-evaluate which textarea is active based on current state
      // Check if either textarea is currently focused
      const quickAddFocused =
        quickTaskNotesInputRef.value && document.activeElement === quickTaskNotesInputRef.value
      const editFocused = notesInputRef.value && document.activeElement === notesInputRef.value

      // Determine which textarea to use based on current state
      let textareaEl: HTMLTextAreaElement | null = null
      if (quickAddFocused) {
        textareaEl = quickTaskNotesInputRef.value
      } else if (editFocused) {
        textareaEl = notesInputRef.value
      } else {
        // Neither is focused - determine based on current form state
        if (editingTaskId.value !== null && notesInputRef.value) {
          textareaEl = notesInputRef.value
        } else if (quickTaskNotesInputRef.value) {
          textareaEl = quickTaskNotesInputRef.value
        }
      }

      if (!textareaEl) return

      const newCursorPos = startPos + tag.length + 1
      textareaEl.setSelectionRange(newCursorPos, newCursorPos)
      textareaEl.focus()
    })
  }

  tagSuggestions.value = []
  suggestionIndex.value = -1
}

// Helper function to update a single task in local state and maintain sorting
const updateTaskInState = (updatedTask: Task) => {
  const index = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (index !== -1) {
    // Update the task
    tasks.value[index] = updatedTask
    // Re-sort to maintain order (done tasks to end, then by planned_date)
    tasks.value.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (a.status !== 'done' && b.status === 'done') return -1
      const aDate = a.planned_date || ''
      const bDate = b.planned_date || ''
      return aDate.localeCompare(bDate)
    })
  } else {
    // Task not found - might have moved to a different bucket or been filtered
    // Add it if it matches current filters, otherwise it will appear on next full load
    const shouldShow =
      updatedTask.status !== 'done' ||
      (updatedTask.planned_date &&
        new Date(updatedTask.planned_date + 'T00:00:00') >= new Date(Date.now() - 86400000))
    if (shouldShow) {
      tasks.value.push(updatedTask)
      tasks.value.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1
        if (a.status !== 'done' && b.status === 'done') return -1
        const aDate = a.planned_date || ''
        const bDate = b.planned_date || ''
        return aDate.localeCompare(bDate)
      })
    }
  }
}

// Helper function to scroll to a task element
const scrollToTask = async (taskId: number) => {
  await nextTick()
  // Try to find the task element by data attribute or ID
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement
  if (taskElement) {
    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Add a brief highlight effect
    taskElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
    setTimeout(() => {
      taskElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
    }, 2000)
  }
}

// Helper methods for click handlers to avoid formatter issues with inline JS
const clearQuickTaskDependency = () => {
  quickTaskDependsOn.value = null
  showQuickTaskDependencyDropdown.value = false
}

const setQuickTaskDependency = (taskId: number) => {
  quickTaskDependsOn.value = taskId
  showQuickTaskDependencyDropdown.value = false
}

const clearEditTaskDependency = () => {
  editForm.value.depends_on_task_id = null
  showEditTaskDependencyDropdown.value = false
}

const setEditTaskDependency = (taskId: number) => {
  editForm.value.depends_on_task_id = taskId
  showEditTaskDependencyDropdown.value = false
}

const toggleTaskStatus = async (taskId: number, currentStatus: TaskStatus) => {
  await updateTaskStatus(taskId, currentStatus === 'done' ? 'doing' : 'done')
}

const saveEdit = async () => {
  if (!editingTaskId.value || !editForm.value.title.trim()) return

  // Get the original task to check if dependency or bucket changed
  const originalTask = tasks.value.find((t) => t.id === editingTaskId.value)
  const dependencyChanged = originalTask?.depends_on_task_id !== editForm.value.depends_on_task_id
  const bucketChanged = originalTask?.theme !== editForm.value.theme
  const hasDependents = originalTask ? getDependentTasks(originalTask.id).length > 0 : false

  try {
    const updated = await updateTask(editingTaskId.value, {
      title: editForm.value.title.trim(),
      status: editForm.value.status,
      is_mit: editForm.value.is_mit,
      theme: editForm.value.theme || null,
      planned_date: editForm.value.planned_date || null, // Already in YYYY-MM-DD format from date picker
      notes: editForm.value.notes || null,
      depends_on_task_id: editForm.value.depends_on_task_id,
    })

    // Update themes list if a new theme was added
    if (updated.theme && !availableThemes.value.includes(updated.theme)) {
      availableThemes.value.push(updated.theme)
    }

    // If dependency or bucket changed significantly, we need to reload to get all affected tasks
    // Otherwise, use partial update
    if (dependencyChanged || bucketChanged) {
      // When dependency or bucket changes, affected tasks (dependents, parents) may need updates
      // Fetch all tasks to get updated relationships (this is still better than full page reload)
      const allTasks = await fetchTasks()

      // Update local state with all tasks (filtered view will update automatically)
      tasks.value = allTasks.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1
        if (a.status !== 'done' && b.status === 'done') return -1
        const aDate = a.planned_date || ''
        const bDate = b.planned_date || ''
        return aDate.localeCompare(bDate)
      })

      // Expand relevant parents
      if (updated.depends_on_task_id) {
        expandedParentTasks.value.add(updated.depends_on_task_id)
        const parentTask = tasks.value.find((t) => t.id === updated.depends_on_task_id)
        if (parentTask?.depends_on_task_id) {
          expandedParentTasks.value.add(parentTask.depends_on_task_id)
        }
      }
      if (hasDependents) {
        expandedParentTasks.value.add(updated.id)
      }
    } else {
      // Simple update - just update the task in place
      updateTaskInState(updated)

      // If this task now has a dependency, expand the parent task
      if (updated.depends_on_task_id) {
        expandedParentTasks.value.add(updated.depends_on_task_id)
        const parentTask = tasks.value.find((t) => t.id === updated.depends_on_task_id)
        if (parentTask?.depends_on_task_id) {
          expandedParentTasks.value.add(parentTask.depends_on_task_id)
        }
      }
      if (hasDependents) {
        expandedParentTasks.value.add(updated.id)
      }
    }

    cancelEdit()

    // Scroll to the updated task
    await scrollToTask(updated.id)
  } catch (error: unknown) {
    console.error('Failed to update task:', error)
    // Show user-friendly error message
    const errorMessage =
      (error as { data?: { message?: string }; message?: string })?.data?.message ||
      (error as { message?: string })?.message ||
      'Failed to update task. Please try again.'
    showToast(errorMessage, 'error')
    // On error, reload data silently to ensure consistency
    await loadData(true)
  }
}

const updateTaskStatus = async (id: number, newStatus: TaskStatus) => {
  try {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    // Normalize status to 'doing' or 'done'
    const normalizedStatus: TaskStatus = newStatus === 'done' ? 'done' : 'doing'

    // Check if this is a transition from 'doing' to 'done' (which may activate dependent tasks)
    const wasTransitioningToDone = task.status === 'doing' && normalizedStatus === 'done'

    const updated = await updateTask(id, {
      status: normalizedStatus,
    })

    // Update the task in local state
    updateTaskInState(updated)

    // If task was just marked as done, dependent tasks may have been auto-activated
    // Fetch only the dependent tasks that might have been affected
    if (wasTransitioningToDone) {
      const dependentTasks = getDependentTasks(id)
      if (dependentTasks.length > 0) {
        // Fetch all tasks to get updated dependent tasks (they may have status changes)
        const allTasks = await fetchTasks()
        const dependentTaskIds = dependentTasks.map((t) => t.id)
        const updatedDependents = allTasks.filter((t) => dependentTaskIds.includes(t.id))

        // Update dependent tasks in local state
        updatedDependents.forEach((depTask) => {
          updateTaskInState(depTask)
        })
      }
    }

    // Scroll to the updated task
    await scrollToTask(updated.id)
  } catch (error) {
    console.error('Failed to update task status:', error)
  }
}

const openDeleteModal = async (task: Task) => {
  // If task is done, delete directly with archival
  // Backend will automatically handle dependency reassignment (children to grandfather)
  if (task.status === 'done') {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const dependentCount = hasDependents(task.id) ? getDependentTasks(task.id).length : 0
      await deleteTask(task.id, true) // archive=true for archival record

      // Reload tasks silently to reflect updated dependencies (children may have been reassigned to grandfather)
      await loadData(true)

      if (dependentCount > 0) {
        // Inform user that dependencies were handled automatically
        showToast(
          `Task deleted. ${dependentCount} dependent task(s) were automatically reassigned.`,
          'success',
        )
      } else {
        showToast('Task deleted successfully', 'success')
      }
    } catch (error: unknown) {
      console.error('Failed to delete task:', error)
      const errorMessage =
        (error as { data?: { message?: string }; message?: string })?.data?.message ||
        (error as { message?: string })?.message ||
        'Failed to delete task. Please try again.'
      showToast(errorMessage, 'error')
    }
    return
  }

  // For non-done tasks, show confirmation modal
  taskToDelete.value = { id: task.id, title: task.title }
  showDeleteModal.value = true
}

const handleDeleteTaskClick = (task: Task) => {
  openDeleteModal(task).catch((error) => {
    console.error('Error in delete task handler:', error)
  })
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  taskToDelete.value = null
}

const handleDelete = async (archive: boolean = false) => {
  if (!taskToDelete.value) return

  const id = taskToDelete.value.id

  // Backend will automatically handle dependency reassignment (children to grandfather)
  const task = tasks.value.find((t) => t.id === id)
  const dependentCount = task && hasDependents(task.id) ? getDependentTasks(task.id).length : 0

  try {
    await deleteTask(id, archive)

    // Reload tasks silently to reflect updated dependencies (children may have been reassigned to grandfather)
    await loadData(true)

    if (dependentCount > 0) {
      // Inform user that dependencies were handled automatically
      showToast(
        `Task deleted. ${dependentCount} dependent task(s) were automatically reassigned.`,
        'success',
      )
    } else {
      showToast('Task deleted successfully', 'success')
    }

    closeDeleteModal()
  } catch (error: unknown) {
    console.error('Failed to delete task:', error)
    const errorMessage =
      (error as { data?: { message?: string }; message?: string })?.data?.message ||
      (error as { message?: string })?.message ||
      'Failed to delete task. Please try again.'
    showToast(errorMessage, 'error')
  }
}

const handlePurge = async () => {
  // Find all completed tasks (status === 'done')
  // Backend will automatically handle dependency reassignment (children to grandfather)
  const completedTasks = tasks.value.filter((t) => t.status === 'done')

  if (completedTasks.length === 0) {
    showToast('No completed tasks to delete.', 'info')
    return
  }

  if (
    !confirm(
      `Are you sure you want to delete ${completedTasks.length} completed task(s)? This action cannot be undone.`,
    )
  ) {
    return
  }

  isPurging.value = true
  const taskIdsToDelete = completedTasks.map((t) => t.id)

  try {
    // Use Promise.allSettled to handle partial successes/failures
    // Backend automatically handles dependency reassignment for each task
    const results = await Promise.allSettled(
      taskIdsToDelete.map((id) => deleteTask(id, true)), // archive=true for archival record
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    // Always reload data silently to reflect updated dependencies (children may have been reassigned to grandfather)
    await loadData(true)

    if (failed > 0) {
      // Some deletions failed
      showToast(`Deleted ${successful} task(s). ${failed} task(s) failed to delete.`, 'warning')
    } else {
      // All deletions succeeded
      showToast(`Successfully deleted ${successful} completed task(s).`, 'success')
    }
  } catch (error) {
    // Unexpected error - reload from server to ensure UI state is accurate
    console.error('Failed to delete tasks:', error)
    await loadData(true)
    showToast('Failed to delete some tasks. Please try again.', 'error')
  } finally {
    isPurging.value = false
  }
}

const handleExportCSV = () => {
  showExportMenu.value = false
  exportTasksReport()
}

const handlePrintReport = () => {
  showExportMenu.value = false
  navigateTo(`/dev/planner/print/today?date=${getLocalDateString()}`)
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
    showToast('Tasks exported successfully', 'success')
  } catch (error) {
    console.error('Failed to export tasks:', error)
    showToast('Failed to export tasks. Please try again.', 'error')
  }
}

const handleBulkUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      showToast('CSV file must have a header row and at least one task', 'error')
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const titleIdx = headers.indexOf('title')
    const dateIdx = headers.indexOf('date')
    const themeIdx = headers.indexOf('theme')
    const mitIdx = headers.indexOf('mit')

    if (titleIdx === -1) {
      showToast('CSV file must have a "title" column', 'error')
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

    // Reload data silently
    await loadData(true)
    isBulkUploadVisible.value = false
    bulkUploadFile.value = null
    if (bulkUploadInput.value) bulkUploadInput.value.value = ''

    showToast(`Successfully created ${tasksToCreate.length} task(s)`, 'success')
  } catch (error) {
    console.error('Failed to upload tasks:', error)
    showToast('Failed to upload tasks. Please check the file format.', 'error')
  }
}

// Set up event listeners and cleanup at top level
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.menu-container')) {
    showExportMenu.value = false
    showThemeDropdown.value = false
    isThemeInputVisible.value = false
    showQuickTaskDependencyDropdown.value = false
    showEditTaskDependencyDropdown.value = false
  }
}

// Load data on mount
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
  <div>
    <div class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden w-full">
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
                      ? 'Database disconnected - check console for errors and verify DATABASE_URL is set correctly'
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
              to="/dev/planner/review"
              class="px-2.5 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors touch-manipulation flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
              style="touch-action: manipulation; min-height: 32px"
            >
              <Icon name="mdi:chart-line" size="16" />
              <span>Review</span>
            </NuxtLink>
            <button
              class="px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors touch-manipulation flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
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
      <div v-if="isLoading" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
        ></div>
      </div>

      <div v-else>
        <!-- Quick Add Task Section -->
        <div class="mb-3">
          <div
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-2.5"
          >
            <!-- Task and Notes row (aligned layout) -->
            <div class="flex flex-col sm:flex-row gap-2 mb-1.5 items-start">
              <!-- Task input -->
              <div class="flex-1 flex flex-col w-full">
                <div class="flex items-center justify-between mb-1.5 h-5">
                  <label
                    class="block text-xs font-medium text-gray-700 dark:text-gray-300 leading-5"
                  >
                    Task
                  </label>
                  <span class="text-xs text-transparent leading-5">Placeholder</span>
                </div>
                <input
                  ref="quickTaskInput"
                  v-model="quickTaskTitle"
                  type="text"
                  placeholder="Add task..."
                  class="w-full px-2.5 py-2 sm:px-2.5 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px] sm:h-[44px]"
                  style="box-sizing: border-box"
                  @keyup.enter="handleQuickAddTask"
                  @keyup.esc="handleQuickTaskEsc"
                  @focus="isAddingQuickTask = true"
                />
              </div>

              <!-- Notes field -->
              <div class="flex-1 flex flex-col w-full">
                <div class="flex items-center justify-between mb-1.5 h-5">
                  <label
                    class="block text-xs font-medium text-gray-700 dark:text-gray-300 leading-5"
                    >Notes</label
                  >
                  <button
                    type="button"
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline touch-manipulation py-1 px-1 leading-5"
                    @click="showTagLegendQuickAdd = !showTagLegendQuickAdd"
                  >
                    {{ showTagLegendQuickAdd ? 'Hide' : 'Show' }} Tags
                  </button>
                </div>
                <div class="relative">
                  <textarea
                    ref="quickTaskNotesInputRef"
                    v-model="quickTaskNotes"
                    class="w-full px-2.5 py-2 sm:px-2.5 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px] sm:h-[44px]"
                    style="box-sizing: border-box; vertical-align: top"
                    rows="2"
                    placeholder="Add notes... Use @ or # for tags (e.g., @delegate, @quick-win)"
                    @focus="isAddingQuickTask = true"
                    @input="handleQuickNotesInput"
                    @keydown="handleQuickNotesKeydown"
                  />
                  <!-- Tag Suggestions Dropdown for quick add -->
                  <div
                    v-if="tagSuggestions.length > 0"
                    ref="tagSuggestionsRef"
                    class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
                    style="left: 0; top: 100%"
                  >
                    <div
                      v-for="(tagInfo, index) in tagSuggestions"
                      :key="tagInfo.tag"
                      :data-suggestion-index="index"
                      :class="[
                        'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm',
                        index === suggestionIndex ? 'bg-blue-100 dark:bg-blue-900/40' : '',
                      ]"
                      @click="insertTag(tagInfo.tag)"
                    >
                      <div class="font-medium text-gray-900 dark:text-gray-100">
                        {{ tagInfo.tag }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ tagInfo.description }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tag Legend for quick add (shown below when toggled) -->
            <div
              v-if="
                showTagLegendQuickAdd &&
                (isAddingQuickTask || quickTaskTitle?.trim() || quickTaskNotes?.trim())
              "
              class="mb-1.5 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
            >
              <!-- Quadrant Reference Guide -->
              <div class="mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
                <div class="font-semibold mb-1.5 text-gray-900 dark:text-gray-100 text-xs">
                  Quadrant Guide:
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <div class="flex items-center gap-1">
                    <span
                      class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0"
                      >Q1</span
                    >
                    <span class="text-gray-600 dark:text-gray-400 text-xs">Do Now</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span
                      class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0"
                      >Q2</span
                    >
                    <span class="text-gray-600 dark:text-gray-400 text-xs">Schedule</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span
                      class="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 shrink-0"
                      >Q3</span
                    >
                    <span class="text-gray-600 dark:text-gray-400 text-xs">Defer</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span
                      class="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shrink-0"
                      >Q4</span
                    >
                    <span class="text-gray-600 dark:text-gray-400 text-xs">Later</span>
                  </div>
                </div>
              </div>

              <!-- Support Needed Tasks -->
              <div class="mb-2">
                <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                  Support Needed:
                </div>
                <div class="flex flex-wrap gap-1">
                  <div
                    v-for="tagInfo in availableTags.filter((t) => t.category === 'support-needed')"
                    :key="tagInfo.tag"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                  >
                    <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                      tagInfo.tag
                    }}</span>
                    <span class="text-gray-500 dark:text-gray-500">•</span>
                    <span class="text-gray-700 dark:text-gray-300">{{ tagInfo.description }}</span>
                    <span
                      :class="[
                        'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
              <div class="mb-2">
                <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                  Time/Effort:
                </div>
                <div class="flex flex-wrap gap-1">
                  <div
                    v-for="tagInfo in availableTags.filter((t) => t.category === 'time-effort')"
                    :key="tagInfo.tag"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                  >
                    <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                      tagInfo.tag
                    }}</span>
                    <span class="text-gray-500 dark:text-gray-500">•</span>
                    <span class="text-gray-700 dark:text-gray-300">{{ tagInfo.description }}</span>
                    <span
                      :class="[
                        'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                  Administrative:
                </div>
                <div class="flex flex-wrap gap-1">
                  <div
                    v-for="tagInfo in availableTags.filter((t) => t.category === 'administrative')"
                    :key="tagInfo.tag"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                  >
                    <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                      tagInfo.tag
                    }}</span>
                    <span class="text-gray-500 dark:text-gray-500">•</span>
                    <span class="text-gray-700 dark:text-gray-300">{{ tagInfo.description }}</span>
                    <span
                      :class="[
                        'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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

            <!-- Options row (shown when focused or typing) -->
            <div
              v-show="isAddingQuickTask || quickTaskTitle?.trim() || quickTaskNotes?.trim()"
              class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 relative"
            >
              <!-- Date Input overlaid on button (for browser compatibility) -->
              <div class="flex items-center gap-1 relative">
                <div class="relative">
                  <input
                    ref="datePickerRef"
                    v-model="quickTaskDate"
                    type="date"
                    :class="[
                      'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10',
                      'px-2 py-1.5 rounded-lg',
                    ]"
                    :title="quickTaskDate ? `Date: ${quickTaskDate}` : 'Set date'"
                    @dblclick="quickTaskDate = null"
                  />
                  <div
                    :class="[
                      'px-2 py-1.5 rounded-lg transition-colors touch-manipulation flex items-center gap-1.5 pointer-events-none',
                      quickTaskDate
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                    ]"
                  >
                    <Icon name="mdi:calendar" size="16" />
                    <span v-if="quickTaskDate" class="text-xs font-medium">
                      {{ formatDateToDisplay(quickTaskDate) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Bucket Icon Button with Dropdown and Display -->
              <div class="relative menu-container flex items-center gap-1">
                <button
                  type="button"
                  :class="[
                    'px-2 py-1.5 rounded-lg transition-colors touch-manipulation flex items-center gap-1.5',
                    quickTaskTheme
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
                  ]"
                  :title="quickTaskTheme ? `Bucket: ${quickTaskTheme}` : 'Select bucket'"
                  @click.stop="showThemeDropdown = !showThemeDropdown"
                >
                  <Icon name="mdi:folder" size="16" />
                  <span v-if="quickTaskTheme" class="text-xs font-medium max-w-[80px] truncate">
                    {{ quickTaskTheme }}
                  </span>
                </button>
                <!-- Theme Dropdown -->
                <div
                  v-if="showThemeDropdown"
                  class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[150px]"
                  style="left: 0; top: 100%"
                  @click.stop
                >
                  <div
                    class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm border-b border-gray-200 dark:border-gray-700"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900/40': !quickTaskTheme,
                    }"
                    @click="clearQuickTaskTheme"
                  >
                    <div class="font-medium text-gray-900 dark:text-gray-100">No Bucket</div>
                  </div>
                  <div
                    v-for="theme in availableThemes"
                    :key="theme"
                    class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900/40': quickTaskTheme === theme,
                    }"
                    @click="selectQuickTaskTheme(theme)"
                  >
                    <div class="font-medium text-gray-900 dark:text-gray-100">{{ theme }}</div>
                  </div>
                </div>
              </div>

              <!-- New Bucket Icon Button -->
              <button
                type="button"
                class="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center"
                title="New bucket"
                @click.stop="isThemeInputVisible = !isThemeInputVisible"
              >
                <Icon name="mdi:plus" size="18" />
              </button>

              <!-- MIT Icon Toggle Button -->
              <button
                type="button"
                :class="[
                  'p-2 rounded-lg transition-colors touch-manipulation flex items-center justify-center',
                  quickTaskIsMit
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
                ]"
                title="MIT (Most Important Task)"
                @click="quickTaskIsMit = !quickTaskIsMit"
              >
                <Icon name="mdi:flag" size="18" />
              </button>

              <!-- Dependency Dropdown (only shown when bucket is chosen and there are active tasks) -->
              <div
                v-if="
                  (quickTaskTheme || newThemeName.value?.trim()) &&
                  availableTasksForDependency.length > 0
                "
                class="relative menu-container"
              >
                <button
                  type="button"
                  :class="[
                    'px-1.5 py-1 sm:px-1 sm:py-0.5 rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-0.5',
                    quickTaskDependsOn
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
                  ]"
                  :title="
                    quickTaskDependsOn
                      ? `Depends on: ${getTaskById(quickTaskDependsOn)?.title || 'Task'}`
                      : 'Link to another task in this bucket'
                  "
                  @click.stop="showQuickTaskDependencyDropdown = !showQuickTaskDependencyDropdown"
                >
                  <Icon name="mdi:link-variant" size="14" class="sm:w-3 sm:h-3" />
                  <span
                    v-if="quickTaskDependsOn"
                    class="text-xs font-medium max-w-[60px] truncate leading-tight"
                  >
                    {{ getTaskById(quickTaskDependsOn)?.title || 'Task' }}
                  </span>
                </button>
                <!-- Dependency Dropdown -->
                <div
                  v-if="showQuickTaskDependencyDropdown"
                  class="absolute z-[60] mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto min-w-[160px] max-w-[200px]"
                  style="left: 0; top: 100%"
                  @click.stop
                >
                  <div
                    class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs border-b border-gray-200 dark:border-gray-700"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900/40': !quickTaskDependsOn,
                    }"
                    @click="clearQuickTaskDependency"
                  >
                    <div class="font-medium text-gray-900 dark:text-gray-100">No Dependency</div>
                  </div>
                  <div
                    v-for="task in availableTasksForDependency"
                    :key="task.id"
                    class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900/40': quickTaskDependsOn === task.id,
                    }"
                    @click="setQuickTaskDependency(task.id)"
                  >
                    <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ task.title }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- New Theme Input (when + button is clicked) -->
              <div class="relative menu-container">
                <input
                  v-if="isThemeInputVisible"
                  v-model="newThemeName"
                  type="text"
                  placeholder="Bucket"
                  class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 w-28 sm:w-20 h-9 sm:min-h-0"
                  @keyup.enter="addNewTheme"
                  @keyup.esc="handleThemeInputEsc"
                  @keydown="handleThemeInputKeydown"
                  @input="selectedThemeSuggestionIndex = -1"
                />
                <!-- Theme Suggestions Dropdown -->
                <div
                  v-if="isThemeInputVisible && themeSuggestions.length > 0"
                  ref="themeSuggestionsRef"
                  class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[120px] max-w-[200px]"
                  style="left: 0; top: 100%"
                  @click.stop
                >
                  <div
                    v-for="(suggestion, index) in themeSuggestions"
                    :key="suggestion"
                    :data-theme-suggestion-index="index"
                    :class="[
                      'px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs',
                      index === selectedThemeSuggestionIndex
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : '',
                    ]"
                    @click="selectThemeSuggestion(suggestion)"
                  >
                    <div class="text-gray-900 dark:text-gray-100 truncate">{{ suggestion }}</div>
                  </div>
                </div>
              </div>

              <!-- Add Button (moved to end of options row) -->
              <button
                v-if="quickTaskTitle?.trim()"
                class="px-3 py-2 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors touch-manipulation flex items-center justify-center gap-1.5 ml-auto"
                @click="handleQuickAddTask"
              >
                <Icon name="mdi:plus" size="16" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tasks List -->
        <div class="relative">
          <!-- When filter + Action Buttons (Bulk Upload, Purge) on one line -->
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <!-- When: All | Today | Tomorrow | Later -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">When:</span>
              <button
                :class="[
                  'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  dateFilter === 'all'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                ]"
                @click="dateFilter = 'all'"
              >
                All
              </button>
              <button
                :class="[
                  'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  dateFilter === 'today'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                ]"
                @click="dateFilter = 'today'"
              >
                Today
              </button>
              <button
                :class="[
                  'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  dateFilter === 'tomorrow'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                ]"
                @click="dateFilter = 'tomorrow'"
              >
                Tomorrow
              </button>
              <button
                :class="[
                  'px-2.5 py-1 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  dateFilter === 'later'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                ]"
                @click="dateFilter = 'later'"
              >
                Later
              </button>
            </div>
            <!-- Bulk Upload + Purge -->
            <div class="flex items-center gap-2">
              <button
                class="p-2 rounded-lg transition-colors touch-manipulation bg-blue-500 hover:bg-blue-600 text-white"
                title="Bulk upload tasks"
                @click="isBulkUploadVisible = true"
              >
                <Icon name="mdi:upload" size="22" />
              </button>
              <button
                :class="[
                  'p-2 rounded-lg transition-colors touch-manipulation',
                  isPurging
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white',
                ]"
                :disabled="isPurging"
                :title="isPurging ? 'Purging...' : 'Purge all completed tasks'"
                @click="handlePurge"
              >
                <Icon name="mdi:delete-sweep" size="22" />
              </button>
            </div>
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
                :data-task-id="task.id"
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
                  class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full min-w-0"
                >
                  <!-- Done/Doing Toggle (square toggle) -->
                  <button
                    :class="[
                      'relative w-11 h-6 sm:w-8 sm:h-4 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 touch-manipulation flex-shrink-0',
                      task.status === 'done'
                        ? 'bg-green-500 dark:bg-green-600 focus:ring-green-500'
                        : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400',
                    ]"
                    @click="toggleTaskStatus(task.id, task.status)"
                  >
                    <span
                      :class="[
                        'absolute top-0.5 left-0.5 h-5 w-5 sm:h-3 sm:w-3 bg-white shadow-sm transform transition-transform duration-200 rounded-sm',
                        task.status === 'done'
                          ? 'translate-x-5 sm:translate-x-3.5'
                          : 'translate-x-0',
                      ]"
                    ></span>
                  </button>

                  <!-- Task Title and Notes (compact) -->
                  <div class="flex-1 min-w-0">
                    <div
                      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1 min-w-0"
                    >
                      <div
                        :class="[
                          'text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1',
                          task.status === 'done'
                            ? 'text-gray-500 dark:text-gray-500 line-through'
                            : 'text-gray-900 dark:text-gray-100',
                        ]"
                        title="Click to edit"
                        @click.stop="startEdit(task)"
                      >
                        <div class="flex flex-wrap items-center gap-2 min-w-0">
                          <!-- Expand/Collapse Button for Parent Tasks -->
                          <button
                            v-if="getFilteredDependentTasks(task.id).length > 0"
                            type="button"
                            class="p-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            @click.stop="toggleDependents(task.id)"
                          >
                            <Icon
                              :name="
                                expandedParentTasks.has(task.id)
                                  ? 'mdi:chevron-down'
                                  : 'mdi:chevron-right'
                              "
                              size="16"
                            />
                          </button>
                          <span v-else class="w-4"></span>
                          <span class="font-medium min-w-0 break-words">
                            {{ task.title }}
                          </span>
                          <!-- Rollover Counter -->
                          <span
                            v-if="task.rollover_count && task.rollover_count > 0"
                            class="font-bold whitespace-nowrap flex-shrink-0"
                            style="color: rgb(220, 38, 38) !important; font-weight: bold !important"
                          >
                            +{{ task.rollover_count }}
                          </span>
                          <!-- Dependency Indicator (for child tasks) -->
                          <span
                            v-if="task.depends_on_task_id"
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800"
                          >
                            <Icon name="mdi:link-variant" size="12" />
                            <span class="truncate max-w-[100px]">{{
                              getTaskById(task.depends_on_task_id)?.title || 'Task'
                            }}</span>
                          </span>
                          <!-- Dependent Count Badge -->
                          <span
                            v-if="getFilteredDependentTasks(task.id).length > 0"
                            class="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded border border-green-200 dark:border-green-800"
                          >
                            {{ getFilteredDependentTasks(task.id).length }}
                          </span>
                        </div>
                        <div
                          v-if="task.notes"
                          class="text-gray-600 dark:text-gray-400 mt-1 sm:mt-0 sm:ml-2 min-w-0 break-words"
                        >
                          <span class="hidden sm:inline">– </span>{{ task.notes }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div
                    class="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start mt-1 sm:mt-0"
                  >
                    <!-- Date Tag (hidden for done tasks, clickable to edit) -->
                    <span
                      v-if="task.planned_date && task.status !== 'done'"
                      class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation whitespace-nowrap"
                      title="Click to edit"
                      @click.stop="startEdit(task)"
                    >
                      {{
                        formatDateRelative(task.planned_date) ||
                        formatDateToDisplay(task.planned_date) ||
                        task.planned_date
                      }}
                    </span>

                    <!-- Delete Icon -->
                    <button
                      :class="[
                        'p-2 transition-colors touch-manipulation',
                        'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
                      ]"
                      :title="
                        hasDependents(task.id)
                          ? `Delete (${getDependentTasks(task.id).length} dependent task(s) will be reassigned automatically)`
                          : 'Delete'
                      "
                      @click.stop="handleDeleteTaskClick(task)"
                    >
                      <Icon name="mdi:delete-outline" size="20" />
                    </button>
                  </div>

                  <!-- Tag Legend for view mode (shown below when toggled) -->
                  <div
                    v-if="showTagLegendForTask.value?.has(task.id)"
                    class="mt-2 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                  >
                    <!-- Quadrant Reference Guide -->
                    <div class="mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
                      <div class="font-semibold mb-1.5 text-gray-900 dark:text-gray-100 text-xs">
                        Quadrant Guide:
                      </div>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0"
                            >Q1</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Do Now</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0"
                            >Q2</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Schedule</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 shrink-0"
                            >Q3</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Defer</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shrink-0"
                            >Q4</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Later</span>
                        </div>
                      </div>
                    </div>

                    <!-- Support Needed Tasks -->
                    <div class="mb-2">
                      <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                        Support Needed:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <div
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'support-needed',
                          )"
                          :key="tagInfo.tag"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                            tagInfo.tag
                          }}</span>
                          <span class="text-gray-500 dark:text-gray-500">•</span>
                          <span class="text-gray-700 dark:text-gray-300">{{
                            tagInfo.description
                          }}</span>
                          <span
                            :class="[
                              'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                    <div class="mb-2">
                      <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                        Time/Effort:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <div
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'time-effort',
                          )"
                          :key="tagInfo.tag"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                            tagInfo.tag
                          }}</span>
                          <span class="text-gray-500 dark:text-gray-500">•</span>
                          <span class="text-gray-700 dark:text-gray-300">{{
                            tagInfo.description
                          }}</span>
                          <span
                            :class="[
                              'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                      <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                        Administrative:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <div
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'administrative',
                          )"
                          :key="tagInfo.tag"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                            tagInfo.tag
                          }}</span>
                          <span class="text-gray-500 dark:text-gray-500">•</span>
                          <span class="text-gray-700 dark:text-gray-300">{{
                            tagInfo.description
                          }}</span>
                          <span
                            :class="[
                              'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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

                <!-- Edit Mode -->
                <div v-else class="space-y-2 sm:space-y-1.5 py-2 sm:py-1.5 relative">
                  <!-- Task and Notes row (aligned layout - same as quick add) -->
                  <div class="flex flex-col sm:flex-row gap-2 mb-1.5 items-start">
                    <!-- Task input -->
                    <div class="flex-1 flex flex-col w-full">
                      <div class="flex items-center justify-between mb-1.5 h-5">
                        <label
                          class="block text-xs font-medium text-gray-700 dark:text-gray-300 leading-5"
                        >
                          Task
                        </label>
                        <span class="text-xs text-transparent leading-5">Placeholder</span>
                      </div>
                      <input
                        v-model="editForm.title"
                        type="text"
                        class="w-full px-2.5 py-2 sm:px-2.5 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px] sm:h-[44px]"
                        style="box-sizing: border-box"
                        @keyup.enter="saveEdit"
                        @keyup.esc="cancelEdit"
                      />
                    </div>

                    <!-- Notes field -->
                    <div class="flex-1 flex flex-col w-full">
                      <div class="flex items-center justify-between mb-1.5 h-5">
                        <label
                          class="block text-xs font-medium text-gray-700 dark:text-gray-300 leading-5"
                          >Notes</label
                        >
                        <button
                          type="button"
                          class="text-xs text-blue-600 dark:text-blue-400 hover:underline touch-manipulation py-1 px-1 leading-5"
                          @click="showTagLegendEdit = !showTagLegendEdit"
                        >
                          {{ showTagLegendEdit ? 'Hide' : 'Show' }} Tags
                        </button>
                      </div>
                      <div class="relative flex items-stretch gap-1.5">
                        <textarea
                          ref="notesInputRef"
                          v-model="editForm.notes"
                          class="flex-1 px-2.5 py-2 sm:px-2.5 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px] sm:h-[44px]"
                          style="box-sizing: border-box; vertical-align: top"
                          rows="2"
                          placeholder="Add notes... Use @ or # for tags (e.g., @delegate, @quick-win)"
                          @input="handleNotesInput"
                          @keydown="handleNotesKeydown"
                        />
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            class="p-2 sm:p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 touch-manipulation"
                            title="Save changes"
                            @click.stop="saveEdit"
                          >
                            <Icon name="mdi:check" size="20" class="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            class="p-2 sm:p-1.5 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-900/20 touch-manipulation"
                            title="Cancel editing"
                            @click="cancelEdit"
                          >
                            <Icon name="mdi:close" size="20" class="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                        <!-- Tag Suggestions Dropdown -->
                        <div
                          v-if="tagSuggestions.length > 0"
                          ref="tagSuggestionsRef"
                          class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
                          style="left: 0; top: 100%"
                        >
                          <div
                            v-for="(tagInfo, index) in tagSuggestions"
                            :key="tagInfo.tag"
                            :data-suggestion-index="index"
                            :class="[
                              'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm',
                              index === suggestionIndex ? 'bg-blue-100 dark:bg-blue-900/40' : '',
                            ]"
                            @click="insertTag(tagInfo.tag)"
                          >
                            <div class="font-medium text-gray-900 dark:text-gray-100">
                              {{ tagInfo.tag }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              {{ tagInfo.description }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Options row (Date, Bucket, MIT) -->
                  <div
                    class="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700"
                  >
                    <input
                      v-model="editForm.planned_date"
                      type="date"
                      class="px-3 py-2.5 sm:px-2.5 sm:py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0"
                    />
                    <!-- Theme Dropdown with New Bucket Button on Same Row -->
                    <div class="flex items-center gap-1.5">
                      <div class="relative menu-container flex-1">
                        <select
                          v-if="!isEditThemeInputVisible"
                          v-model="editForm.theme"
                          class="px-2.5 py-2 sm:px-1.5 sm:py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0 w-full"
                        >
                          <option :value="null">Bucket</option>
                          <option v-for="theme in availableThemes" :key="theme" :value="theme">
                            {{ theme }}
                          </option>
                        </select>
                        <!-- New Theme Input (when + button is clicked) -->
                        <input
                          v-if="isEditThemeInputVisible"
                          v-model="newEditThemeName"
                          type="text"
                          placeholder="Bucket"
                          class="px-2.5 py-2 sm:px-1.5 sm:py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0 w-full"
                          @keyup.enter="addNewEditTheme"
                          @keyup.esc="handleEditThemeInputEsc"
                          @keydown="handleEditThemeInputKeydown"
                          @input="selectedEditThemeSuggestionIndex = -1"
                        />
                        <!-- Edit Theme Suggestions Dropdown -->
                        <div
                          v-if="isEditThemeInputVisible && editThemeSuggestions.length > 0"
                          ref="editThemeSuggestionsRef"
                          class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[120px] max-w-[200px]"
                          style="left: 0; top: 100%"
                          @click.stop
                        >
                          <div
                            v-for="(suggestion, index) in editThemeSuggestions"
                            :key="suggestion"
                            :data-theme-suggestion-index="index"
                            :class="[
                              'px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs',
                              index === selectedEditThemeSuggestionIndex
                                ? 'bg-blue-100 dark:bg-blue-900/40'
                                : '',
                            ]"
                            @click="selectEditThemeSuggestion(suggestion)"
                          >
                            <div class="text-gray-900 dark:text-gray-100 truncate">
                              {{ suggestion }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- New Bucket Icon Button -->
                      <button
                        type="button"
                        class="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center min-h-[44px] sm:min-h-0"
                        title="New bucket"
                        @click.stop="isEditThemeInputVisible = !isEditThemeInputVisible"
                      >
                        <Icon name="mdi:plus" size="18" />
                      </button>
                    </div>
                    <label
                      class="flex items-center gap-2 px-3 py-2 sm:px-1.5 sm:py-1 text-xs text-gray-700 dark:text-gray-300 touch-manipulation min-h-[44px] sm:min-h-0 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                    >
                      <input
                        v-model="editForm.is_mit"
                        type="checkbox"
                        class="w-4 h-4 sm:w-3 sm:h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span>MIT</span>
                    </label>

                    <!-- Dependency Dropdown (only shown when bucket is chosen and there are active tasks OR task has a dependency) -->
                    <div
                      v-if="
                        (editForm.theme ||
                          (isEditThemeInputVisible && newEditThemeName.value?.trim())) &&
                        (availableTasksForDependency.length > 0 || editForm.depends_on_task_id)
                      "
                      class="relative menu-container"
                    >
                      <button
                        type="button"
                        :class="[
                          'px-1.5 py-1 sm:px-1 sm:py-0.5 rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-0.5',
                          editForm.depends_on_task_id
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
                        ]"
                        :title="
                          editForm.depends_on_task_id
                            ? `Depends on: ${getTaskById(editForm.depends_on_task_id)?.title || 'Task'}`
                            : 'Link to another task in this bucket'
                        "
                        @click.stop="
                          showEditTaskDependencyDropdown = !showEditTaskDependencyDropdown
                        "
                      >
                        <Icon name="mdi:link-variant" size="14" class="sm:w-3 sm:h-3" />
                        <span
                          v-if="editForm.depends_on_task_id"
                          class="text-xs font-medium max-w-[60px] truncate leading-tight"
                        >
                          {{ getTaskById(editForm.depends_on_task_id)?.title || 'Task' }}
                        </span>
                      </button>
                      <!-- Dependency Dropdown -->
                      <div
                        v-if="showEditTaskDependencyDropdown"
                        class="absolute z-[60] mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto min-w-[160px] max-w-[200px]"
                        style="left: 0; top: 100%"
                        @click.stop
                      >
                        <div
                          class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs border-b border-gray-200 dark:border-gray-700"
                          :class="{
                            'bg-blue-100 dark:bg-blue-900/40': !editForm.depends_on_task_id,
                          }"
                          @click="clearEditTaskDependency"
                        >
                          <div class="font-medium text-gray-900 dark:text-gray-100">
                            No Dependency
                          </div>
                        </div>
                        <div
                          v-for="depTask in availableTasksForDependency"
                          :key="depTask.id"
                          class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                          :class="{
                            'bg-blue-100 dark:bg-blue-900/40':
                              editForm.depends_on_task_id === depTask.id,
                          }"
                          @click="setEditTaskDependency(depTask.id)"
                        >
                          <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {{ depTask.title }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Tag Legend -->
                  <div
                    v-if="showTagLegendEdit"
                    class="mt-1.5 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                  >
                    <!-- Quadrant Reference Guide -->
                    <div class="mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
                      <div class="font-semibold mb-1.5 text-gray-900 dark:text-gray-100 text-xs">
                        Quadrant Guide:
                      </div>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0"
                            >Q1</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Do Now</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0"
                            >Q2</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Schedule</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 shrink-0"
                            >Q3</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Defer</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span
                            class="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shrink-0"
                            >Q4</span
                          >
                          <span class="text-gray-600 dark:text-gray-400 text-xs">Later</span>
                        </div>
                      </div>
                    </div>

                    <!-- Support Needed Tasks -->
                    <div class="mb-2">
                      <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                        Support Needed:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <div
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'support-needed',
                          )"
                          :key="tagInfo.tag"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                            tagInfo.tag
                          }}</span>
                          <span class="text-gray-500 dark:text-gray-500">•</span>
                          <span class="text-gray-700 dark:text-gray-300">{{
                            tagInfo.description
                          }}</span>
                          <span
                            :class="[
                              'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                    <div class="mb-2">
                      <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                        Time/Effort:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <div
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'time-effort',
                          )"
                          :key="tagInfo.tag"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                            tagInfo.tag
                          }}</span>
                          <span class="text-gray-500 dark:text-gray-500">•</span>
                          <span class="text-gray-700 dark:text-gray-300">{{
                            tagInfo.description
                          }}</span>
                          <span
                            :class="[
                              'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                      <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                        Administrative:
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <div
                          v-for="tagInfo in availableTags.filter(
                            (t) => t.category === 'administrative',
                          )"
                          :key="tagInfo.tag"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{
                            tagInfo.tag
                          }}</span>
                          <span class="text-gray-500 dark:text-gray-500">•</span>
                          <span class="text-gray-700 dark:text-gray-300">{{
                            tagInfo.description
                          }}</span>
                          <span
                            :class="[
                              'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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

                <!-- Collapsible Dependent Tasks (Level 1) -->
                <div
                  v-if="
                    getFilteredDependentTasks(task.id).length > 0 &&
                    expandedParentTasks.has(task.id)
                  "
                  class="ml-8 mt-2 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-3"
                >
                  <div
                    v-for="dependentTask in getFilteredDependentTasks(task.id)"
                    :key="dependentTask.id"
                    :data-task-id="dependentTask.id"
                    :class="[
                      'px-2 py-1.5 border-l-2 border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 rounded-r transition-all',
                      editingTaskId === dependentTask.id &&
                        'bg-blue-100 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600',
                      dependentTask.is_mit &&
                        editingTaskId !== dependentTask.id &&
                        'bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-600',
                      !dependentTask.is_mit &&
                        editingTaskId !== dependentTask.id &&
                        'border-blue-300 dark:border-blue-600',
                    ]"
                  >
                    <div
                      v-if="editingTaskId !== dependentTask.id"
                      class="flex flex-row items-center gap-2 sm:gap-3"
                    >
                      <!-- Done/Doing Toggle -->
                      <button
                        :class="[
                          'relative w-8 h-4 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 touch-manipulation flex-shrink-0',
                          dependentTask.status === 'done'
                            ? 'bg-green-500 dark:bg-green-600 focus:ring-green-500'
                            : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400',
                        ]"
                        @click="toggleTaskStatus(dependentTask.id, dependentTask.status)"
                      >
                        <span
                          :class="[
                            'absolute top-0.5 left-0.5 h-3 w-3 bg-white shadow-sm transform transition-transform duration-200 rounded-sm',
                            dependentTask.status === 'done' ? 'translate-x-3.5' : 'translate-x-0',
                          ]"
                        ></span>
                      </button>

                      <!-- Task Title -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                          <!-- Expand/Collapse Button for Level 2 Dependents -->
                          <button
                            v-if="getFilteredDependentTasks(dependentTask.id).length > 0"
                            type="button"
                            class="p-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            @click.stop="toggleDependents(dependentTask.id)"
                          >
                            <Icon
                              :name="
                                expandedParentTasks.has(dependentTask.id)
                                  ? 'mdi:chevron-down'
                                  : 'mdi:chevron-right'
                              "
                              size="14"
                            />
                          </button>
                          <span v-else class="w-4"></span>
                          <span
                            :class="[
                              'text-xs font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
                              dependentTask.status === 'done'
                                ? 'text-gray-500 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-gray-100',
                            ]"
                            title="Click to edit"
                            @click.stop="startEdit(dependentTask)"
                          >
                            {{ dependentTask.title }}
                          </span>
                          <!-- Rollover Counter for Dependent Tasks -->
                          <span
                            v-if="dependentTask.rollover_count && dependentTask.rollover_count > 0"
                            class="text-xs font-bold text-red-600 dark:text-red-400 ml-1 whitespace-nowrap flex-shrink-0"
                            style="color: rgb(220, 38, 38) !important; font-weight: bold !important"
                          >
                            +{{ dependentTask.rollover_count }}
                          </span>
                          <!-- Dependent Count Badge for Level 2 -->
                          <span
                            v-if="getFilteredDependentTasks(dependentTask.id).length > 0"
                            class="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded border border-green-200 dark:border-green-800"
                          >
                            {{ getFilteredDependentTasks(dependentTask.id).length }}
                          </span>
                        </div>
                        <span
                          v-if="dependentTask.notes"
                          :class="[
                            'text-xs text-gray-600 dark:text-gray-400 ml-5',
                            dependentTask.status === 'done' && 'line-through',
                          ]"
                        >
                          – {{ dependentTask.notes }}
                        </span>
                      </div>

                      <!-- Actions -->
                      <div class="flex items-center gap-1 flex-shrink-0">
                        <!-- Date Tag -->
                        <span
                          v-if="dependentTask.planned_date && dependentTask.status !== 'done'"
                          class="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation whitespace-nowrap"
                          title="Click to edit"
                          @click.stop="startEdit(dependentTask)"
                        >
                          {{
                            formatDateRelative(dependentTask.planned_date) ||
                            formatDateToDisplay(dependentTask.planned_date) ||
                            dependentTask.planned_date
                          }}
                        </span>

                        <!-- Delete Icon -->
                        <button
                          :class="[
                            'p-1 transition-colors touch-manipulation',
                            'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
                          ]"
                          :title="
                            hasDependents(dependentTask.id)
                              ? `Delete (${getDependentTasks(dependentTask.id).length} dependent task(s) will be reassigned automatically)`
                              : 'Delete'
                          "
                          @click.stop="handleDeleteTaskClick(dependentTask)"
                        >
                          <Icon name="mdi:delete-outline" size="16" />
                        </button>
                      </div>
                    </div>

                    <!-- Edit Mode for Dependent Task (Full Edit Form) -->
                    <div v-else class="space-y-2 sm:space-y-1.5 py-2 sm:py-1.5 relative">
                      <!-- Task and Notes row (aligned layout - same as parent tasks) -->
                      <div class="flex flex-col sm:flex-row gap-2 mb-1.5 items-start">
                        <!-- Task input -->
                        <div class="flex-1 flex flex-col w-full">
                          <div class="flex items-center justify-between mb-1.5 h-5">
                            <label
                              class="block text-xs font-medium text-gray-700 dark:text-gray-300 leading-5"
                            >
                              Task
                            </label>
                            <span class="text-xs text-transparent leading-5">Placeholder</span>
                          </div>
                          <input
                            v-model="editForm.title"
                            type="text"
                            class="w-full px-2.5 py-2 sm:px-2.5 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px] sm:h-[44px]"
                            style="box-sizing: border-box"
                            @keyup.enter="saveEdit"
                            @keyup.esc="cancelEdit"
                          />
                        </div>

                        <!-- Notes field -->
                        <div class="flex-1 flex flex-col w-full">
                          <div class="flex items-center justify-between mb-1.5 h-5">
                            <label
                              class="block text-xs font-medium text-gray-700 dark:text-gray-300 leading-5"
                              >Notes</label
                            >
                            <button
                              type="button"
                              class="text-xs text-blue-600 dark:text-blue-400 hover:underline touch-manipulation py-1 px-1 leading-5"
                              @click="showTagLegendEdit = !showTagLegendEdit"
                            >
                              {{ showTagLegendEdit ? 'Hide' : 'Show' }} Tags
                            </button>
                          </div>
                          <div class="relative flex items-stretch gap-1.5">
                            <textarea
                              ref="notesInputRef"
                              v-model="editForm.notes"
                              class="flex-1 px-2.5 py-2 sm:px-2.5 sm:py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[48px] sm:h-[44px]"
                              style="box-sizing: border-box; vertical-align: top"
                              rows="2"
                              placeholder="Add notes... Use @ or # for tags (e.g., @delegate, @quick-win)"
                              @input="handleNotesInput"
                              @keydown="handleNotesKeydown"
                            />
                            <div class="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                class="p-2 sm:p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/20 touch-manipulation"
                                title="Save changes"
                                @click.stop="saveEdit"
                              >
                                <Icon name="mdi:check" size="20" class="sm:w-[18px] sm:h-[18px]" />
                              </button>
                              <button
                                class="p-2 sm:p-1.5 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-50 dark:hover:bg-gray-900/20 touch-manipulation"
                                title="Cancel editing"
                                @click="cancelEdit"
                              >
                                <Icon name="mdi:close" size="20" class="sm:w-[18px] sm:h-[18px]" />
                              </button>
                            </div>
                            <!-- Tag Suggestions Dropdown -->
                            <div
                              v-if="tagSuggestions.length > 0"
                              ref="tagSuggestionsRef"
                              class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
                              style="left: 0; top: 100%"
                            >
                              <div
                                v-for="(tagInfo, index) in tagSuggestions"
                                :key="tagInfo.tag"
                                :data-suggestion-index="index"
                                :class="[
                                  'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm',
                                  index === suggestionIndex
                                    ? 'bg-blue-100 dark:bg-blue-900/40'
                                    : '',
                                ]"
                                @click="insertTag(tagInfo.tag)"
                              >
                                <div class="font-medium text-gray-900 dark:text-gray-100">
                                  {{ tagInfo.tag }}
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                  {{ tagInfo.description }}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Options row (Date, Bucket, MIT, Dependency) -->
                      <div
                        class="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700"
                      >
                        <input
                          v-model="editForm.planned_date"
                          type="date"
                          class="px-3 py-2.5 sm:px-2.5 sm:py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0"
                        />
                        <!-- Theme Dropdown with New Bucket Button on Same Row -->
                        <div class="flex items-center gap-1.5">
                          <div class="relative menu-container flex-1">
                            <select
                              v-if="!isEditThemeInputVisible"
                              v-model="editForm.theme"
                              class="px-2.5 py-2 sm:px-1.5 sm:py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0 w-full"
                            >
                              <option :value="null">Bucket</option>
                              <option v-for="theme in availableThemes" :key="theme" :value="theme">
                                {{ theme }}
                              </option>
                            </select>
                            <!-- New Theme Input (when + button is clicked) -->
                            <input
                              v-if="isEditThemeInputVisible"
                              v-model="newEditThemeName"
                              type="text"
                              placeholder="Bucket"
                              class="px-2.5 py-2 sm:px-1.5 sm:py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 min-h-[44px] sm:min-h-0 w-full"
                              @keyup.enter="addNewEditTheme"
                              @keyup.esc="handleEditThemeInputEsc"
                              @keydown="handleEditThemeInputKeydown"
                              @input="selectedEditThemeSuggestionIndex = -1"
                            />
                            <!-- Edit Theme Suggestions Dropdown -->
                            <div
                              v-if="isEditThemeInputVisible && editThemeSuggestions.length > 0"
                              ref="editThemeSuggestionsRef"
                              class="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[120px] max-w-[200px]"
                              style="left: 0; top: 100%"
                              @click.stop
                            >
                              <div
                                v-for="(suggestion, index) in editThemeSuggestions"
                                :key="suggestion"
                                :data-theme-suggestion-index="index"
                                :class="[
                                  'px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs',
                                  index === selectedEditThemeSuggestionIndex
                                    ? 'bg-blue-100 dark:bg-blue-900/40'
                                    : '',
                                ]"
                                @click="selectEditThemeSuggestion(suggestion)"
                              >
                                <div class="text-gray-900 dark:text-gray-100 truncate">
                                  {{ suggestion }}
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- New Bucket Icon Button -->
                          <button
                            type="button"
                            class="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation flex items-center justify-center min-h-[44px] sm:min-h-0"
                            title="New bucket"
                            @click.stop="isEditThemeInputVisible = !isEditThemeInputVisible"
                          >
                            <Icon name="mdi:plus" size="18" />
                          </button>
                        </div>
                        <label
                          class="flex items-center gap-2 px-3 py-2 sm:px-1.5 sm:py-1 text-xs text-gray-700 dark:text-gray-300 touch-manipulation min-h-[44px] sm:min-h-0 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                        >
                          <input
                            v-model="editForm.is_mit"
                            type="checkbox"
                            class="w-4 h-4 sm:w-3 sm:h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span>MIT</span>
                        </label>

                        <!-- Dependency Dropdown (only shown when bucket is chosen and there are active tasks OR task has a dependency) -->
                        <div
                          v-if="
                            (editForm.theme ||
                              (isEditThemeInputVisible && newEditThemeName.value?.trim())) &&
                            (availableTasksForDependency.length > 0 || editForm.depends_on_task_id)
                          "
                          class="relative menu-container"
                        >
                          <button
                            type="button"
                            :class="[
                              'px-1.5 py-1 sm:px-1 sm:py-0.5 rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-0.5',
                              editForm.depends_on_task_id
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
                            ]"
                            :title="
                              editForm.depends_on_task_id
                                ? `Depends on: ${getTaskById(editForm.depends_on_task_id)?.title || 'Task'}`
                                : 'Link to another task in this bucket'
                            "
                            @click.stop="
                              showEditTaskDependencyDropdown = !showEditTaskDependencyDropdown
                            "
                          >
                            <Icon name="mdi:link-variant" size="14" class="sm:w-3 sm:h-3" />
                            <span
                              v-if="editForm.depends_on_task_id"
                              class="text-xs font-medium max-w-[60px] truncate leading-tight"
                            >
                              {{ getTaskById(editForm.depends_on_task_id)?.title || 'Task' }}
                            </span>
                          </button>
                          <!-- Dependency Dropdown -->
                          <div
                            v-if="showEditTaskDependencyDropdown"
                            class="absolute z-[60] mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto min-w-[160px] max-w-[200px]"
                            style="left: 0; top: 100%"
                            @click.stop
                          >
                            <div
                              class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs border-b border-gray-200 dark:border-gray-700"
                              :class="{
                                'bg-blue-100 dark:bg-blue-900/40': !editForm.depends_on_task_id,
                              }"
                              @click="clearEditTaskDependency"
                            >
                              <div class="font-medium text-gray-900 dark:text-gray-100">
                                No Dependency
                              </div>
                            </div>
                            <div
                              v-for="depTask in availableTasksForDependency"
                              :key="depTask.id"
                              class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                              :class="{
                                'bg-blue-100 dark:bg-blue-900/40':
                                  editForm.depends_on_task_id === depTask.id,
                              }"
                              @click="setEditTaskDependency(depTask.id)"
                            >
                              <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {{ depTask.title }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Tag Legend -->
                      <div
                        v-if="showTagLegendEdit"
                        class="mt-1.5 p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                      >
                        <!-- Same tag legend as parent tasks - copy from parent edit form -->
                        <!-- Quadrant Reference Guide -->
                        <div class="mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
                          <div
                            class="font-semibold mb-1.5 text-gray-900 dark:text-gray-100 text-xs"
                          >
                            Quadrant Guide:
                          </div>
                          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            <div class="flex items-center gap-1">
                              <span
                                class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shrink-0"
                                >Q1</span
                              >
                              <span class="text-gray-600 dark:text-gray-400 text-xs">Do Now</span>
                            </div>
                            <div class="flex items-center gap-1">
                              <span
                                class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0"
                                >Q2</span
                              >
                              <span class="text-gray-600 dark:text-gray-400 text-xs">Schedule</span>
                            </div>
                            <div class="flex items-center gap-1">
                              <span
                                class="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 shrink-0"
                                >Q3</span
                              >
                              <span class="text-gray-600 dark:text-gray-400 text-xs">Defer</span>
                            </div>
                            <div class="flex items-center gap-1">
                              <span
                                class="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shrink-0"
                                >Q4</span
                              >
                              <span class="text-gray-600 dark:text-gray-400 text-xs">Later</span>
                            </div>
                          </div>
                        </div>
                        <!-- Support Needed Tasks -->
                        <div class="mb-2">
                          <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                            Support Needed:
                          </div>
                          <div class="flex flex-wrap gap-1">
                            <div
                              v-for="tagInfo in availableTags.filter(
                                (t) => t.category === 'support-needed',
                              )"
                              :key="tagInfo.tag"
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                            >
                              <span
                                class="font-mono font-semibold text-blue-600 dark:text-blue-400"
                                >{{ tagInfo.tag }}</span
                              >
                              <span class="text-gray-500 dark:text-gray-500">•</span>
                              <span class="text-gray-700 dark:text-gray-300">{{
                                tagInfo.description
                              }}</span>
                              <span
                                :class="[
                                  'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                        <div class="mb-2">
                          <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                            Time/Effort:
                          </div>
                          <div class="flex flex-wrap gap-1">
                            <div
                              v-for="tagInfo in availableTags.filter(
                                (t) => t.category === 'time-effort',
                              )"
                              :key="tagInfo.tag"
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                            >
                              <span
                                class="font-mono font-semibold text-blue-600 dark:text-blue-400"
                                >{{ tagInfo.tag }}</span
                              >
                              <span class="text-gray-500 dark:text-gray-500">•</span>
                              <span class="text-gray-700 dark:text-gray-300">{{
                                tagInfo.description
                              }}</span>
                              <span
                                :class="[
                                  'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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
                          <div class="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">
                            Administrative:
                          </div>
                          <div class="flex flex-wrap gap-1">
                            <div
                              v-for="tagInfo in availableTags.filter(
                                (t) => t.category === 'administrative',
                              )"
                              :key="tagInfo.tag"
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                            >
                              <span
                                class="font-mono font-semibold text-blue-600 dark:text-blue-400"
                                >{{ tagInfo.tag }}</span
                              >
                              <span class="text-gray-500 dark:text-gray-500">•</span>
                              <span class="text-gray-700 dark:text-gray-300">{{
                                tagInfo.description
                              }}</span>
                              <span
                                :class="[
                                  'ml-0.5 px-1 py-0.5 rounded text-xs font-semibold shrink-0',
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

                    <!-- Collapsible Level 2 Dependent Tasks (Grandchildren) -->
                    <div
                      v-if="
                        getFilteredDependentTasks(dependentTask.id).length > 0 &&
                        expandedParentTasks.has(dependentTask.id)
                      "
                      class="ml-6 mt-1.5 space-y-1 border-l-2 border-green-300 dark:border-green-600 pl-2"
                    >
                      <div
                        v-for="grandchildTask in getFilteredDependentTasks(dependentTask.id)"
                        :key="grandchildTask.id"
                        :data-task-id="grandchildTask.id"
                        :class="[
                          'px-1.5 py-1 border-l-2 border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-950/20 rounded-r transition-all',
                          editingTaskId === grandchildTask.id &&
                            'bg-green-100 dark:bg-green-950/40 border-green-500 dark:border-green-400',
                          grandchildTask.is_mit &&
                            editingTaskId !== grandchildTask.id &&
                            'bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-600',
                          !grandchildTask.is_mit &&
                            editingTaskId !== grandchildTask.id &&
                            'border-green-400 dark:border-green-500',
                        ]"
                      >
                        <div
                          v-if="editingTaskId !== grandchildTask.id"
                          class="flex flex-row items-center gap-1.5 sm:gap-2"
                        >
                          <!-- Done/Doing Toggle -->
                          <button
                            :class="[
                              'relative w-7 h-3.5 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 touch-manipulation flex-shrink-0',
                              grandchildTask.status === 'done'
                                ? 'bg-green-500 dark:bg-green-600 focus:ring-green-500'
                                : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400',
                            ]"
                            @click="toggleTaskStatus(grandchildTask.id, grandchildTask.status)"
                          >
                            <span
                              :class="[
                                'absolute top-0.5 left-0.5 h-2.5 w-2.5 bg-white shadow-sm transform transition-transform duration-200 rounded-sm',
                                grandchildTask.status === 'done'
                                  ? 'translate-x-3'
                                  : 'translate-x-0',
                              ]"
                            ></span>
                          </button>

                          <!-- Task Title -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5">
                              <span
                                :class="[
                                  'text-xs font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
                                  grandchildTask.status === 'done'
                                    ? 'text-gray-500 dark:text-gray-500 line-through'
                                    : 'text-gray-900 dark:text-gray-100',
                                ]"
                                title="Click to edit"
                                @click.stop="startEdit(grandchildTask)"
                              >
                                {{ grandchildTask.title }}
                              </span>
                              <!-- Rollover Counter for Grandchild Tasks -->
                              <span
                                v-if="
                                  grandchildTask.rollover_count && grandchildTask.rollover_count > 0
                                "
                                class="text-xs font-bold text-red-600 dark:text-red-400 ml-1 whitespace-nowrap flex-shrink-0"
                                style="
                                  color: rgb(220, 38, 38) !important;
                                  font-weight: bold !important;
                                "
                              >
                                +{{ grandchildTask.rollover_count }}
                              </span>
                              <!-- Dependent Count Badge for Level 2 (if it had dependents, but max depth is 2, so this won't show) -->
                              <span
                                v-if="getFilteredDependentTasks(grandchildTask.id).length > 0"
                                class="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded border border-green-200 dark:border-green-800"
                              >
                                {{ getFilteredDependentTasks(grandchildTask.id).length }}
                              </span>
                            </div>
                            <span
                              v-if="grandchildTask.notes"
                              :class="[
                                'text-xs text-gray-600 dark:text-gray-400 ml-5',
                                grandchildTask.status === 'done' && 'line-through',
                              ]"
                            >
                              – {{ grandchildTask.notes }}
                            </span>
                          </div>

                          <!-- Actions -->
                          <div class="flex items-center gap-1 flex-shrink-0">
                            <!-- Date Tag -->
                            <span
                              v-if="grandchildTask.planned_date && grandchildTask.status !== 'done'"
                              class="px-1 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation whitespace-nowrap"
                              title="Click to edit"
                              @click.stop="startEdit(grandchildTask)"
                            >
                              {{
                                formatDateRelative(grandchildTask.planned_date) ||
                                formatDateToDisplay(grandchildTask.planned_date) ||
                                grandchildTask.planned_date
                              }}
                            </span>

                            <!-- Delete Icon -->
                            <button
                              :class="[
                                'p-0.5 transition-colors touch-manipulation',
                                'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
                              ]"
                              :title="
                                hasDependents(grandchildTask.id)
                                  ? `Delete (${getDependentTasks(grandchildTask.id).length} dependent task(s) will be reassigned automatically)`
                                  : 'Delete'
                              "
                              @click.stop="handleDeleteTaskClick(grandchildTask)"
                            >
                              <Icon name="mdi:delete-outline" size="14" />
                            </button>
                          </div>
                        </div>

                        <!-- Edit Mode for Level 2 Dependent Task (Full Edit Form) -->
                        <div v-else class="space-y-1.5 py-1.5 relative">
                          <!-- Same full edit form as level 1 dependents -->
                          <div class="flex flex-col gap-1.5">
                            <input
                              v-model="editForm.title"
                              type="text"
                              class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                              @keyup.enter="saveEdit"
                              @keyup.esc="cancelEdit"
                            />
                            <textarea
                              ref="notesInputRef"
                              v-model="editForm.notes"
                              class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 resize-none"
                              rows="2"
                              placeholder="Add notes..."
                              @input="handleNotesInput"
                              @keydown="handleNotesKeydown"
                            />
                            <div class="flex items-center gap-1.5">
                              <input
                                v-model="editForm.planned_date"
                                type="date"
                                class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                              />
                              <select
                                v-model="editForm.theme"
                                class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                              >
                                <option :value="null">Bucket</option>
                                <option
                                  v-for="theme in availableThemes"
                                  :key="theme"
                                  :value="theme"
                                >
                                  {{ theme }}
                                </option>
                              </select>
                              <label
                                class="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                              >
                                <input
                                  v-model="editForm.is_mit"
                                  type="checkbox"
                                  class="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <span>MIT</span>
                              </label>
                              <!-- Dependency Dropdown (only shown when bucket is chosen and there are active tasks OR task has a dependency) -->
                              <div
                                v-if="
                                  (editForm.theme ||
                                    (isEditThemeInputVisible && newEditThemeName.value?.trim())) &&
                                  (availableTasksForDependency.length > 0 ||
                                    editForm.depends_on_task_id)
                                "
                                class="relative menu-container"
                              >
                                <button
                                  type="button"
                                  :class="[
                                    'px-1.5 py-1 sm:px-1 sm:py-0.5 rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-0.5',
                                    editForm.depends_on_task_id
                                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
                                  ]"
                                  :title="
                                    editForm.depends_on_task_id
                                      ? `Depends on: ${getTaskById(editForm.depends_on_task_id)?.title || 'Task'}`
                                      : 'Link to another task in this bucket'
                                  "
                                  @click.stop="
                                    showEditTaskDependencyDropdown = !showEditTaskDependencyDropdown
                                  "
                                >
                                  <Icon name="mdi:link-variant" size="14" class="sm:w-3 sm:h-3" />
                                  <span
                                    v-if="editForm.depends_on_task_id"
                                    class="text-xs font-medium max-w-[60px] truncate leading-tight"
                                  >
                                    {{ getTaskById(editForm.depends_on_task_id)?.title || 'Task' }}
                                  </span>
                                </button>
                                <!-- Dependency Dropdown -->
                                <div
                                  v-if="showEditTaskDependencyDropdown"
                                  class="absolute z-[60] mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto min-w-[160px] max-w-[200px]"
                                  style="left: 0; top: 100%"
                                  @click.stop
                                >
                                  <div
                                    class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs border-b border-gray-200 dark:border-gray-700"
                                    :class="{
                                      'bg-blue-100 dark:bg-blue-900/40':
                                        !editForm.depends_on_task_id,
                                    }"
                                    @click="clearEditTaskDependency"
                                  >
                                    <div class="font-medium text-gray-900 dark:text-gray-100">
                                      No Dependency
                                    </div>
                                  </div>
                                  <div
                                    v-for="depTask in availableTasksForDependency"
                                    :key="depTask.id"
                                    class="px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                                    :class="{
                                      'bg-blue-100 dark:bg-blue-900/40':
                                        editForm.depends_on_task_id === depTask.id,
                                    }"
                                    @click="setEditTaskDependency(depTask.id)"
                                  >
                                    <div
                                      class="font-medium text-gray-900 dark:text-gray-100 truncate"
                                    >
                                      {{ depTask.title }}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                class="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors rounded"
                                title="Save"
                                @click.stop="saveEdit"
                              >
                                <Icon name="mdi:check" size="14" />
                              </button>
                              <button
                                type="button"
                                class="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded"
                                title="Cancel"
                                @click.stop="cancelEdit"
                              >
                                <Icon name="mdi:close" size="14" />
                              </button>
                            </div>
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
              }}<template v-if="hiddenDependentCount > 0">
                ({{ hiddenDependentCount }} dependent task{{
                  hiddenDependentCount !== 1 ? 's' : ''
                }}
                hidden — click ▶ next to a task to expand)
              </template>
            </div>
            <div
              class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
            >
              <Icon name="mdi:information-outline" size="16" class="inline align-middle mr-1" />
              <span>
                Use the purge icon above to remove completed tasks. Archived tasks are preserved for
                statistics and can be viewed in the
                <NuxtLink to="/dev/planner/review" class="underline font-medium"
                  >Review page</NuxtLink
                >.
              </span>
            </div>
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
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Bulk Upload Tasks
            </h2>
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

    <!-- Toast Notifications -->
    <CommonToast />
  </div>
</template>
