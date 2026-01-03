/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1, // substitution
        )
      }
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

/**
 * Find similar strings from a list based on input
 * Returns an array of similar strings sorted by similarity (highest first)
 */
export function findSimilarStrings(
  input: string,
  candidates: string[],
  options: {
    threshold?: number // Minimum similarity score (0-1)
    maxResults?: number // Maximum number of results to return
  } = {},
): string[] {
  if (!input.trim()) return []

  const { threshold = 0.3, maxResults = 5 } = options
  const normalizedInput = input.toLowerCase().trim()

  // Filter out exact matches (case-insensitive)
  const exactMatch = candidates.find((c) => c.toLowerCase().trim() === normalizedInput)
  if (exactMatch) {
    return [exactMatch] // Return only exact match if found
  }

  // Calculate similarity for each candidate
  const similarities = candidates
    .map((candidate) => {
      const normalizedCandidate = candidate.toLowerCase().trim()

      // Check for contains match (higher priority)
      const containsMatch =
        normalizedInput.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedInput)

      // Calculate Levenshtein similarity
      const similarity = levenshteinDistance(normalizedInput, normalizedCandidate)

      // Boost similarity score if it's a contains match
      const finalSimilarity = containsMatch ? Math.max(similarity, 0.6) : similarity

      return {
        candidate,
        similarity: finalSimilarity,
      }
    })
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)
    .map((item) => item.candidate)

  return similarities
}
