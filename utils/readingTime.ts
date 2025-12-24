/**
 * Calculate reading time in minutes based on word count
 * Average reading speed: 200-250 words per minute
 * We use 225 words per minute as a standard
 */
export function calculateReadingTime(text: string): number {
  if (!text) return 0

  // Remove HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, '')

  // Count words (split by whitespace and filter empty strings)
  const wordCount = cleanText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length

  // Calculate reading time (225 words per minute)
  const wordsPerMinute = 225
  const readingTime = Math.ceil(wordCount / wordsPerMinute)

  // Return at least 1 minute for any content
  return Math.max(1, readingTime)
}

/**
 * Format reading time as a human-readable string
 */
export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return '1 min read'
  }
  return `${minutes} min read`
}
