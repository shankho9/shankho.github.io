<script setup lang="ts">
import type { Task, TaskPriority } from '~/server/api/planner/tasks.get'

interface Props {
  task: Task
}

interface Emits {
  (e: 'update', task: Task): void
  (e: 'delete', id: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateTask, deleteTask, fetchThemes } = useTasks()

const isEditing = ref(false)
const editTitle = ref(props.task.title)
const editNotes = ref(props.task.notes || '')
const editTheme = ref(props.task.theme || null)
const availableThemes = ref<string[]>([])

const priorityColors: Record<TaskPriority, string> = {
  high: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  low: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
}

const priorityLabels: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const handleToggleMit = async () => {
  try {
    const updated = await updateTask(props.task.id, { is_mit: !props.task.is_mit })
    emit('update', updated)
  } catch (error) {
    console.error('Failed to toggle MIT:', error)
  }
}

const handlePriorityChange = async (priority: TaskPriority) => {
  try {
    const updated = await updateTask(props.task.id, { priority })
    emit('update', updated)
  } catch (error) {
    console.error('Failed to update priority:', error)
  }
}

const handleSaveEdit = async () => {
  if (!editTitle.value.trim()) return

  try {
    const updated = await updateTask(props.task.id, {
      title: editTitle.value.trim(),
      notes: editNotes.value || null,
      theme: editTheme.value || null,
    })
    emit('update', updated)
    isEditing.value = false
  } catch (error) {
    console.error('Failed to update task:', error)
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this task?')) return

  try {
    await deleteTask(props.task.id)
    emit('delete', props.task.id)
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

const handleCancelEdit = () => {
  editTitle.value = props.task.title
  editNotes.value = props.task.notes || ''
  editTheme.value = props.task.theme || null
  isEditing.value = false
}

onMounted(async () => {
  try {
    availableThemes.value = await fetchThemes()
  } catch (error) {
    console.error('Failed to load themes:', error)
  }
})
</script>

<template>
  <div
    :class="[
      'rounded-lg border p-3 transition-colors',
      priorityColors[task.priority],
      task.is_mit && 'ring-2 ring-purple-500',
    ]"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <button
            v-if="!isEditing"
            :class="[
              'text-sm font-semibold px-3 py-1.5 sm:px-2 sm:py-0.5 rounded transition-colors touch-manipulation min-h-[44px] sm:min-h-0',
              task.is_mit
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            ]"
            title="Toggle MIT (Most Important Task)"
            @click="handleToggleMit"
          >
            MIT
          </button>
          <span
            v-if="!task.is_mit"
            :class="[
              'text-xs font-medium',
              priorityColors[task.priority].includes('red')
                ? 'text-red-700 dark:text-red-300'
                : priorityColors[task.priority].includes('yellow')
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-blue-700 dark:text-blue-300',
            ]"
          >
            {{ priorityLabels[task.priority] }}
          </span>
          <span
            v-if="task.theme && !isEditing"
            class="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          >
            {{ task.theme }}
          </span>
        </div>

        <div v-if="!isEditing" class="space-y-1">
          <p class="font-medium text-gray-900 dark:text-gray-100 break-words">{{ task.title }}</p>
          <p
            v-if="task.notes"
            class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words"
          >
            {{ task.notes }}
          </p>
        </div>

        <div v-else class="space-y-2">
          <input
            v-model="editTitle"
            type="text"
            class="w-full px-3 py-2.5 sm:px-2 sm:py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-base sm:text-sm min-h-[44px] sm:min-h-0"
            placeholder="Task title"
            @keyup.enter="handleSaveEdit"
            @keyup.esc="handleCancelEdit"
          />
          <textarea
            v-model="editNotes"
            class="w-full px-3 py-2.5 sm:px-2 sm:py-1 border rounded text-base sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            rows="4"
            placeholder="Notes (optional)"
          />
          <select
            v-model="editTheme"
            class="w-full px-3 py-2.5 sm:px-2 sm:py-1 border rounded text-base sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 min-h-[44px] sm:min-h-0"
          >
            <option :value="null">No Theme</option>
            <option v-for="theme in availableThemes" :key="theme" :value="theme">
              {{ theme }}
            </option>
          </select>
          <div class="flex gap-2">
            <button
              class="px-4 py-2.5 sm:px-2 sm:py-1 text-base sm:text-sm bg-green-500 text-white rounded hover:bg-green-600 touch-manipulation min-h-[44px] sm:min-h-0"
              @click="handleSaveEdit"
            >
              Save
            </button>
            <button
              class="px-4 py-2.5 sm:px-2 sm:py-1 text-base sm:text-sm bg-gray-500 text-white rounded hover:bg-gray-600 touch-manipulation min-h-[44px] sm:min-h-0"
              @click="handleCancelEdit"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div v-if="!isEditing" class="flex gap-1 sm:gap-1 flex-shrink-0">
        <div class="relative group">
          <button
            class="p-2 sm:p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title="Change priority"
          >
            <Icon name="mdi:flag" class="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <div
            class="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10"
          >
            <button
              class="w-full text-left px-3 py-2 sm:py-1 text-base sm:text-sm hover:bg-red-50 dark:hover:bg-red-950/20 touch-manipulation min-h-[44px] sm:min-h-0"
              @click="handlePriorityChange('high')"
            >
              High
            </button>
            <button
              class="w-full text-left px-3 py-2 sm:py-1 text-base sm:text-sm hover:bg-yellow-50 dark:hover:bg-yellow-950/20 touch-manipulation min-h-[44px] sm:min-h-0"
              @click="handlePriorityChange('medium')"
            >
              Medium
            </button>
            <button
              class="w-full text-left px-3 py-2 sm:py-1 text-base sm:text-sm hover:bg-blue-50 dark:hover:bg-blue-950/20 touch-manipulation min-h-[44px] sm:min-h-0"
              @click="handlePriorityChange('low')"
            >
              Low
            </button>
          </div>
        </div>
        <button
          class="p-2 sm:p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          title="Edit task"
          @click="isEditing = true"
        >
          <Icon name="mdi:pencil" class="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
        <button
          class="p-2 sm:p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          title="Delete task"
          @click="handleDelete"
        >
          <Icon name="mdi:delete" class="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
