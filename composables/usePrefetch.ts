/**
 * Composable for prefetching content for better performance
 */
import {
  prefetchNextPage,
  prefetchRelatedContent,
  prefetchImage,
} from '~/utils/performance/prefetch'

export const usePrefetch = () => {
  /**
   * Prefetch next page in pagination
   */
  const prefetchNext = (currentPage: number, totalPages: number, baseUrl: string) => {
    if (import.meta.client) {
      prefetchNextPage(currentPage, totalPages, baseUrl)
    }
  }

  /**
   * Prefetch related blog posts
   */
  const prefetchRelated = (paths: string[]) => {
    if (import.meta.client) {
      prefetchRelatedContent(paths)
    }
  }

  /**
   * Prefetch an image
   */
  const prefetchImg = (src: string) => {
    if (import.meta.client) {
      prefetchImage(src)
    }
  }

  /**
   * Prefetch on hover (for better UX)
   */
  const prefetchOnHover = (url: string) => {
    if (import.meta.client) {
      let link: HTMLLinkElement | null = null

      const handleMouseEnter = () => {
        if (!link) {
          link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = url
          link.as = 'document'
          document.head.appendChild(link)
        }
      }

      return {
        onMouseEnter: handleMouseEnter,
        cleanup: () => {
          if (link && link.parentNode) {
            link.parentNode.removeChild(link)
            link = null
          }
        },
      }
    }

    return { onMouseEnter: () => {}, cleanup: () => {} }
  }

  return {
    prefetchNext,
    prefetchRelated,
    prefetchImg,
    prefetchOnHover,
  }
}
