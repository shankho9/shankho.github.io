/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Utility to highlight search terms in text
 * CRITICAL: Escapes HTML in text before highlighting to prevent XSS attacks
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return escapeHtml(text)

  // First escape HTML special characters in the text to prevent XSS
  const escapedText = escapeHtml(text)

  // Escape regex special characters in search term
  const escapedTerm = escapeHtml(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedTerm})`, 'gi')
  return escapedText.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>',
  )
}

/**
 * Highlight multiple search terms in text
 * CRITICAL: Escapes HTML in text before highlighting to prevent XSS attacks
 */
export function highlightMultipleTerms(text: string, terms: string[]): string {
  if (!terms.length || !text) return escapeHtml(text)

  // First escape HTML special characters in the text to prevent XSS
  const escapedText = escapeHtml(text)

  // Escape HTML and regex special characters in search terms
  const escapedTerms = terms
    .map((term) => escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const regex = new RegExp(`(${escapedTerms})`, 'gi')
  return escapedText.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>',
  )
}

/**
 * Get search suggestions from a list of items using Fuse.js
 */
export function getSearchSuggestions(
  query: string,
  items: Array<{ title: string; description?: string; tags?: string[] }>,
  limit: number = 5,
): Array<{ text: string; type: 'title' | 'description' | 'tag' }> {
  if (!query || query.length < 2) return []

  const suggestions: Array<{ text: string; type: 'title' | 'description' | 'tag' }> = []
  const queryLower = query.toLowerCase()

  // Extract unique suggestions from titles, descriptions, and tags
  const seen = new Set<string>()

  for (const item of items) {
    // Match titles
    if (item.title.toLowerCase().includes(queryLower)) {
      const titleLower = item.title.toLowerCase()
      if (!seen.has(titleLower) && suggestions.length < limit) {
        suggestions.push({ text: item.title, type: 'title' })
        seen.add(titleLower)
      }
    }

    // Match descriptions
    if (item.description?.toLowerCase().includes(queryLower)) {
      const descLower = item.description.toLowerCase()
      if (!seen.has(descLower) && suggestions.length < limit) {
        // Extract sentence or snippet containing the term
        const snippet = extractSnippet(item.description, queryLower, 60)
        if (!seen.has(snippet.toLowerCase())) {
          suggestions.push({ text: snippet, type: 'description' })
          seen.add(snippet.toLowerCase())
        }
      }
    }

    // Match tags
    if (item.tags) {
      for (const tag of item.tags) {
        if (tag.toLowerCase().includes(queryLower) && !seen.has(tag.toLowerCase())) {
          if (suggestions.length < limit) {
            suggestions.push({ text: tag, type: 'tag' })
            seen.add(tag.toLowerCase())
          }
        }
      }
    }

    if (suggestions.length >= limit) break
  }

  return suggestions
}

/**
 * Extract a snippet from text containing the search term
 */
function extractSnippet(text: string, term: string, maxLength: number): string {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return text.substring(0, maxLength)

  const start = Math.max(0, index - 20)
  const end = Math.min(text.length, index + term.length + 40)
  let snippet = text.substring(start, end)

  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}
