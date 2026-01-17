/**
 * Safely strip HTML tags and content from text
 * Handles edge cases like malformed tags, comments, and script/style blocks
 */
function stripHtml(html: string): string {
  if (!html) return ''

  let text = html

  // Remove HTML comments (including multi-line)
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove script and style content using position-based approach to avoid
  // multi-character regex patterns that CodeQL flags. Find tag boundaries
  // and remove content between them.
  const scriptStyleTags = ['script', 'style']
  for (const tag of scriptStyleTags) {
    let previous: string
    do {
      previous = text
      const lowerText = text.toLowerCase()

      // Find opening tag <script or <style, verifying it's a tag boundary
      // Search for <tag followed by whitespace, >, or end of string to avoid
      // false matches like <scriptable> or <styling>
      let openStart = -1
      let searchPos = 0
      while (searchPos < lowerText.length) {
        const pos = lowerText.indexOf(`<${tag}`, searchPos)
        if (pos === -1) break

        const afterTag = pos + tag.length + 1 // Position after <tag
        if (afterTag >= text.length) {
          // End of string - treat as malformed tag
          openStart = pos
          break
        }

        const nextChar = text[afterTag]
        // Verify it's a tag boundary: whitespace, >, or end of string
        // Not a letter (which would make it part of another word)
        if (nextChar === '>' || /\s/.test(nextChar)) {
          openStart = pos
          break
        }

        // Continue searching after this position
        searchPos = pos + 1
      }

      if (openStart === -1) break

      // Find the closing > of opening tag
      let openEnd = text.indexOf('>', openStart)
      if (openEnd === -1) {
        // Malformed tag without closing >, remove everything from <tag to end of string
        text = text.substring(0, openStart)
        continue
      }
      openEnd++

      // Find closing tag </script> or </style>
      const closeStart = lowerText.indexOf(`</${tag}>`, openEnd)
      if (closeStart === -1) {
        // No closing tag, remove from opening tag to end
        text = text.substring(0, openStart)
        continue
      }

      // Remove everything from opening tag to closing tag
      const closeEnd = closeStart + tag.length + 3 // length of </tag>
      text = text.substring(0, openStart) + text.substring(closeEnd)
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
