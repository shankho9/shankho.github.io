/**
 * Get consistent color classes for tags based on tag name
 * Uses hash-based color assignment for consistent colors per tag
 * Each tag gets a unique, vibrant color background
 */
export function getTagColorClasses(tag: string): string {
  // Diverse color palette with different backgrounds for each tag
  const colorPalette = [
    'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300',
    'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
    'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
    'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300',
    'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
    'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    'bg-lime-100 dark:bg-lime-900 text-lime-700 dark:text-lime-300',
    'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
    'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
    'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
    'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
    'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300',
  ]

  // Simple hash function to get consistent index for each tag
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Get index from hash (ensure positive)
  const index = Math.abs(hash) % colorPalette.length

  return colorPalette[index]
}

/**
 * Get selected state color classes for tags (darker/more saturated version)
 * Used for filter buttons when a tag is selected
 */
export function getTagSelectedColorClasses(tag: string): string {
  // Selected state palette - darker/more saturated versions
  const selectedColorPalette = [
    'bg-sky-600 dark:bg-sky-700 text-white',
    'bg-purple-600 dark:bg-purple-700 text-white',
    'bg-pink-600 dark:bg-pink-700 text-white',
    'bg-rose-600 dark:bg-rose-700 text-white',
    'bg-orange-600 dark:bg-orange-700 text-white',
    'bg-amber-600 dark:bg-amber-700 text-white',
    'bg-yellow-600 dark:bg-yellow-700 text-white',
    'bg-lime-600 dark:bg-lime-700 text-white',
    'bg-green-600 dark:bg-green-700 text-white',
    'bg-emerald-600 dark:bg-emerald-700 text-white',
    'bg-teal-600 dark:bg-teal-700 text-white',
    'bg-cyan-600 dark:bg-cyan-700 text-white',
    'bg-blue-600 dark:bg-blue-700 text-white',
    'bg-indigo-600 dark:bg-indigo-700 text-white',
    'bg-violet-600 dark:bg-violet-700 text-white',
    'bg-fuchsia-600 dark:bg-fuchsia-700 text-white',
  ]

  // Use the same hash function to get consistent index
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % selectedColorPalette.length

  return selectedColorPalette[index]
}
