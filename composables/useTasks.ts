import type { Task, TaskStatus, TaskPriority } from '~/server/api/planner/tasks.get'

export const useTasks = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || '/api'

  const fetchTasks = async (filters?: {
    status?: TaskStatus
    date?: string
    priority?: TaskPriority
    theme?: string | null
  }): Promise<Task[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.date) params.append('date', filters.date)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.theme !== undefined) {
      params.append('theme', filters.theme || '')
    }

    const query = params.toString()
    const url = `${apiBase}/planner/tasks${query ? `?${query}` : ''}`

    const response = await $fetch<{ tasks: Task[] }>(url)
    return response.tasks
  }

  const fetchThemes = async (): Promise<string[]> => {
    const response = await $fetch<{ themes: string[] }>(`${apiBase}/planner/themes`)
    return response.themes
  }

  const createTask = async (task: {
    title: string
    status?: TaskStatus
    is_mit?: boolean
    priority?: TaskPriority
    planned_date?: string | null
    notes?: string | null
    theme?: string | null
    depends_on_task_id?: number | null
  }): Promise<Task> => {
    const response = await $fetch<{ success: boolean; task: Task }>(`${apiBase}/planner/tasks`, {
      method: 'POST',
      body: task,
    })
    return response.task
  }

  const updateTask = async (
    id: number,
    updates: {
      title?: string
      status?: TaskStatus
      is_mit?: boolean
      priority?: TaskPriority
      planned_date?: string | null
      notes?: string | null
      theme?: string | null
      depends_on_task_id?: number | null
    },
  ): Promise<Task> => {
    const response = await $fetch<{ success: boolean; task: Task }>(
      `${apiBase}/planner/tasks/${id}`,
      {
        method: 'PUT',
        body: updates,
      },
    )
    return response.task
  }

  const deleteTask = async (id: number, archive: boolean = false): Promise<void> => {
    await $fetch<{ success: boolean; message: string; archived?: boolean }>(
      `${apiBase}/planner/tasks/${id}${archive ? '?archive=true' : ''}`,
      {
        method: 'DELETE',
      },
    )
  }

  const purgeDeletedTasks = async (): Promise<{ success: boolean; deletedCount: number }> => {
    return await $fetch<{ success: boolean; deletedCount: number }>(
      `${apiBase}/planner/tasks/purge`,
      {
        method: 'POST',
      },
    )
  }

  return {
    fetchTasks,
    fetchThemes,
    createTask,
    updateTask,
    deleteTask,
    purgeDeletedTasks,
  }
}
