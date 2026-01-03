import type { Task } from '~/server/api/planner/tasks.get'
import type { WeeklyReview } from '~/server/api/planner/weekly-reviews.get'
import { getLocalDateString } from '~/utils/common/dateParser'

export const usePlanner = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || '/api'

  const fetchDailyTasks = async (
    date?: string,
  ): Promise<{ date: string; tasks: Task[]; mits: Task[] }> => {
    const params = date ? `?date=${date}` : ''
    return await $fetch<{ date: string; tasks: Task[]; mits: Task[] }>(
      `${apiBase}/planner/daily-tasks${params}`,
    )
  }

  const fetchWeeklyReview = async (weekStartDate?: string): Promise<WeeklyReview | null> => {
    const params = weekStartDate ? `?weekStartDate=${weekStartDate}` : ''
    const response = await $fetch<{ review: WeeklyReview | null }>(
      `${apiBase}/planner/weekly-reviews${params}`,
    )
    return response.review
  }

  const saveWeeklyReview = async (review: {
    week_start_date: string
    wins?: string | null
    improvements?: string | null
    next_week_mits?: string | null
  }): Promise<WeeklyReview> => {
    const response = await $fetch<{ success: boolean; review: WeeklyReview }>(
      `${apiBase}/planner/weekly-reviews`,
      {
        method: 'POST',
        body: review,
      },
    )
    return response.review
  }

  const getWeekStartDate = (date: Date = new Date()): string => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff))
    return getLocalDateString(monday)
  }

  const getWeekEndDate = (date: Date = new Date()): string => {
    const weekStart = getWeekStartDate(date)
    // Parse weekStart as local date (YYYY-MM-DD format)
    const [year, month, day] = weekStart.split('-').map(Number)
    const start = new Date(year, month - 1, day) // month is 0-indexed
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return getLocalDateString(end)
  }

  return {
    fetchDailyTasks,
    fetchWeeklyReview,
    saveWeeklyReview,
    getWeekStartDate,
    getWeekEndDate,
  }
}
