/**
 * Parse dates in the format "1st Mar 2023" or standard date strings
 * Returns a valid Date object or null if parsing fails
 */
export function parseCustomDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr || dateStr === 'not-date-available' || dateStr.trim() === '') {
    return null
  }

  try {
    // Remove ordinal indicators (st, nd, rd, th)
    const cleanDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1')
    const date = new Date(cleanDateStr)

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null
    }

    return date
  } catch {
    return null
  }
}

/**
 * Get timestamp for sorting, with fallback for invalid dates
 * Invalid dates are sorted to the end (future timestamp)
 */
export function getDateTimestamp(date: Date | null): number {
  if (!date || isNaN(date.getTime())) {
    // Return a very old timestamp so invalid dates sort to the end
    return 0
  }
  return date.getTime()
}

/**
 * Get local date string in YYYY-MM-DD format
 * Uses local timezone instead of UTC to avoid date shifting issues
 * @param date Optional Date object, defaults to current date
 * @returns Date string in YYYY-MM-DD format (local timezone)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert YYYY-MM-DD format to dd-MMM-YYYY format (e.g., "2025-01-15" -> "15-Jan-2025")
 * Uses local timezone parsing to avoid date shifting issues
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date string in dd-MMM-YYYY format, or null if invalid
 */
export function formatDateToDisplay(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  try {
    // Validate it's in YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return null
    }

    // Parse date components to create local date (avoids UTC parsing issues)
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    // Validate the date
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null // Invalid date (e.g., Feb 30)
    }

    const dayStr = String(date.getDate()).padStart(2, '0')
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const monthName = monthNames[date.getMonth()]
    const yearStr = date.getFullYear()

    return `${dayStr}-${monthName}-${yearStr}`
  } catch {
    return null
  }
}

/**
 * Convert dd-MMM-YYYY format to YYYY-MM-DD format (e.g., "15-Jan-2025" -> "2025-01-15")
 * @param dateStr Date string in dd-MMM-YYYY format
 * @returns Date string in YYYY-MM-DD format, or null if invalid
 */
export function parseDisplayDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null

  try {
    // Handle both formats: "15-Jan-2025" and "15-Jan-2025" (with or without spaces)
    const cleaned = dateStr.trim()
    const match = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
    if (!match) return null

    const [, day, monthName, year] = match
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === monthName.toLowerCase())

    if (monthIndex === -1) return null

    // Validate the date
    const date = new Date(parseInt(year), monthIndex, parseInt(day))
    if (
      date.getDate() !== parseInt(day) ||
      date.getMonth() !== monthIndex ||
      date.getFullYear() !== parseInt(year)
    ) {
      return null // Invalid date (e.g., Feb 30)
    }

    const month = String(monthIndex + 1).padStart(2, '0')
    const dayPadded = String(day).padStart(2, '0')

    return `${year}-${month}-${dayPadded}`
  } catch {
    return null
  }
}

/**
 * Get current date in dd-MMM-YYYY format
 * @returns Date string in dd-MMM-YYYY format
 */
export function getCurrentDateDisplay(): string {
  return formatDateToDisplay(getLocalDateString()) || ''
}

/**
 * Convert YYYY-MM-DD date to relative format (today, tomorrow, in x days)
 * Handles both YYYY-MM-DD format and ISO datetime strings
 * @param dateStr Date string in YYYY-MM-DD format or ISO datetime string
 * @returns Relative date string like "today", "tomorrow", "in 3 days", or null if invalid
 */
export function formatDateRelative(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  try {
    // planned_date is now always in YYYY-MM-DD format from the API
    const dateOnly = dateStr

    // Validate it's in YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return formatDateToDisplay(dateOnly) || dateOnly
    }

    // Parse date components to create local date (avoids UTC parsing issues)
    const [year, month, day] = dateOnly.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)

    // Validate the date
    if (
      targetDate.getFullYear() !== year ||
      targetDate.getMonth() !== month - 1 ||
      targetDate.getDate() !== day
    ) {
      return null // Invalid date
    }
    targetDate.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'today'
    } else if (diffDays === 1) {
      return 'tomorrow'
    } else if (diffDays > 1) {
      return `in ${diffDays} days`
    } else if (diffDays === -1) {
      return 'yesterday'
    } else {
      // For past dates, show the formatted date
      return formatDateToDisplay(dateOnly)
    }
  } catch {
    return null
  }
}

/**
 * Calculate days overdue for a task
 * Returns the number of days a task is overdue (planned_date is in the past and task is not done)
 * @param plannedDate Date string in YYYY-MM-DD format or null
 * @param status Task status ('doing' or 'done')
 * @param today Optional today's date string in YYYY-MM-DD format, defaults to current date
 * @returns Number of days overdue (0 if not overdue, task is done, or no planned_date)
 */
export function calculateDaysOverdue(
  plannedDate: string | null | undefined,
  status: string,
  today?: string,
): number {
  // If task is done, not overdue
  if (status === 'done') return 0

  // If no planned date, not overdue
  if (!plannedDate) return 0

  try {
    // Validate it's in YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) {
      return 0
    }

    // Parse date components to create local date (avoids UTC parsing issues)
    const [year, month, day] = plannedDate.split('-').map(Number)
    const dueDate = new Date(year, month - 1, day)
    dueDate.setHours(0, 0, 0, 0)

    // Validate the date
    if (
      dueDate.getFullYear() !== year ||
      dueDate.getMonth() !== month - 1 ||
      dueDate.getDate() !== day
    ) {
      return 0 // Invalid date
    }

    // Get today's date
    const todayDate = today
      ? (() => {
          const [y, m, d] = today.split('-').map(Number)
          const date = new Date(y, m - 1, d)
          date.setHours(0, 0, 0, 0)
          return date
        })()
      : (() => {
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          return now
        })()

    // Calculate difference in days
    const diffTime = todayDate.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // Return 0 if not overdue (due date is today or in the future)
    return diffDays > 0 ? diffDays : 0
  } catch {
    return 0
  }
}
