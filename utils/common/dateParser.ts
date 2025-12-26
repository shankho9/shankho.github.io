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
