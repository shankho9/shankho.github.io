/**
 * Safely strip HTML tags and content from text
 * Handles edge cases like malformed tags, comments, and script/style blocks
 */
function stripHtml(html: string): string {
  if (!html) return ''

  let text = html

  // Remove HTML comments (including multi-line)
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove script and style tags with their content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')

  // Remove all remaining HTML tags (including malformed ones)
  // This regex handles tags that may not have closing > or are malformed
  text = text.replace(/<[^>]*>?/g, '')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

  // Remove any remaining HTML entities (numeric and named)
  text = text.replace(/&#?\w+;/g, ' ')

  return text
}

/**
 * Calculate reading time in minutes based on word count
 * Average reading speed: 200-250 words per minute
 * We use 225 words per minute as a standard
 */
export function calculateReadingTime(text: string): number {
  if (!text) return 0

  // Safely strip HTML tags and content
  const cleanText = stripHtml(text)

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
