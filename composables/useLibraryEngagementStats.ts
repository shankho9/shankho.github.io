/** Batch like/comment counts for Media Library items (gallery / music / resource / app). */
export type LibraryEngagementKind = 'gallery' | 'music' | 'resource' | 'app'

export function useLibraryEngagementStats(getIsAuthenticated: () => boolean) {
  async function loadStatsForItems(
    items: Array<{ id: string | number; likeCount?: number; commentCount?: number }>,
    kind: LibraryEngagementKind = 'gallery',
  ) {
    if (!getIsAuthenticated() || items.length === 0) return

    try {
      const response = await $fetch<{
        success: boolean
        stats: Record<string, { likeCount: number; commentCount: number }>
      }>('/api/library/stats', {
        method: 'POST',
        body: { kind, itemIds: items.map((item) => String(item.id)) },
      })

      if (!response.success) return

      for (const item of items) {
        const stats = response.stats[String(item.id)]
        if (stats) {
          item.likeCount = stats.likeCount
          item.commentCount = stats.commentCount
        }
      }
    } catch (error) {
      console.error('[LibraryStats] Failed to load batch stats:', error)
    }
  }

  async function refreshItemStats(
    itemId: string | number,
    items: Array<{ id: string | number; likeCount?: number; commentCount?: number }>,
    kind: LibraryEngagementKind = 'gallery',
  ) {
    const item = items.find((entry) => String(entry.id) === String(itemId))
    if (!item) return
    await loadStatsForItems([item], kind)
  }

  return { loadStatsForItems, refreshItemStats }
}

/** @deprecated Prefer useLibraryEngagementStats — kept for gallery photo/video call sites. */
export function useGalleryEngagementStats(getIsAuthenticated: () => boolean) {
  return useLibraryEngagementStats(getIsAuthenticated)
}
