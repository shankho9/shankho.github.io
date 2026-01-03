<script setup lang="ts">
import type { Task, TaskStatus } from '~/server/api/planner/tasks.get'
import { getLocalDateString } from '~/utils/common/dateParser'

interface Props {
  title: string
  status: TaskStatus
  tasks: Task[]
}

interface Emits {
  (e: 'update', task: Task): void
  (e: 'delete', id: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createTask } = useTasks()

const isAdding = ref(false)
const newTaskTitle = ref('')

const handleAddTask = async () => {
  if (!newTaskTitle.value.trim()) {
    isAdding.value = false
    return
  }

  try {
    const today = getLocalDateString()
    // All tasks (today, doing, done) should get today's date
    // Backlog status was removed, so no tasks should have null planned_date
    const newTask = await createTask({
      title: newTaskTitle.value.trim(),
      status: props.status,
      planned_date: today,
    })
    emit('update', newTask)
    newTaskTitle.value = ''
    isAdding.value = false
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleAddTask()
  } else if (e.key === 'Escape') {
    newTaskTitle.value = ''
    isAdding.value = false
  }
}
</script>

<template>
  <div
    class="flex flex-col bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-w-[280px]"
    :class="{ 'h-full': tasks.length > 0 || isAdding, 'min-h-[200px]': tasks.length === 0 }"
  >
    <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{{ title }}</h2>

    <div class="flex-1 space-y-3 overflow-y-auto">
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @update="emit('update', $event)"
        @delete="emit('delete', $event)"
      />

      <div
        v-if="isAdding"
        class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3"
      >
        <input
          v-model="newTaskTitle"
          type="text"
          class="w-full px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          placeholder="Task title"
          autofocus
          @keyup="handleKeyUp"
          @blur="handleAddTask"
        />
      </div>
    </div>

    <button
      v-if="!isAdding"
      class="mt-3 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      @click="isAdding = true"
    >
      + Add Task
    </button>
  </div>
</template>
