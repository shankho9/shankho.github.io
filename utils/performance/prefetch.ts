/**
 * Prefetch utilities for performance optimization
 */

/**
 * Prefetch a URL for faster navigation
 */
export function prefetchUrl(url: string): void {
  if (import.meta.server) return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  link.as = 'document'
  document.head.appendChild(link)
}

/**
 * Prefetch multiple URLs
 */
export function prefetchUrls(urls: string[]): void {
  if (import.meta.server) return

  urls.forEach((url) => {
    prefetchUrl(url)
  })
}

/**
 * Prefetch next page in pagination
 */
export function prefetchNextPage(currentPage: number, totalPages: number, baseUrl: string): void {
  if (import.meta.server || currentPage >= totalPages) return

  const nextPageUrl = `${baseUrl}?page=${currentPage + 1}`
  prefetchUrl(nextPageUrl)
}

/**
 * Prefetch related content (blog posts, etc.)
 */
export function prefetchRelatedContent(paths: string[]): void {
  if (import.meta.server) return

  // Only prefetch first 3 to avoid overwhelming the browser
  paths.slice(0, 3).forEach((path) => {
    prefetchUrl(path)
  })
}

/**
 * Prefetch images for better perceived performance
 */
export function prefetchImage(src: string): void {
  if (import.meta.server) return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = src
  link.as = 'image'
  document.head.appendChild(link)
}
