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
  // Handle both complete tags and incomplete/malformed tags to prevent injection vulnerabilities
  {
    let previous: string
    do {
      previous = text
      // Remove complete script and style tags with their content
      text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
      text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove opening script/style tags with closing bracket (e.g., <script src="...">)
      text = text.replace(/<script[\s\S]*?>/gi, '')
      text = text.replace(/<style[\s\S]*?>/gi, '')
      // Remove incomplete script/style tags without closing bracket (e.g., <script, <style)
      // Match until whitespace, >, or end of string to catch all incomplete tags
      text = text.replace(/<script[^\s>]*/gi, '')
      text = text.replace(/<style[^\s>]*/gi, '')
    } while (text !== previous)
  }

  // Remove all remaining HTML tags
  // Repeatedly strip tags to avoid incomplete multi-character sanitization issues
  // Match tags with optional closing bracket and across newlines to handle both
  // well-formed and malformed HTML (e.g., <script, <div) and multi-line tags
  {
    let previous: string
    do {
      previous = text
      // Match tags with optional closing > and across newlines ([^>] includes newlines)
      // The ? makes > optional, allowing us to catch malformed tags like <script
      text = text.replace(/<[^>]*>?/g, '')
    } while (text !== previous)
  }

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

  // Remove any remaining HTML entities (numeric and named)
  text = text.replace(/&#?\w+;/g, ' ')

  // As a safety net, remove any residual angle brackets that could start tags (e.g., "<script")
  text = text.replace(/[<>]/g, '')

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
