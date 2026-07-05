/** Batch like/comment counts for ImageKit gallery items (photos & videos). */
export function useGalleryEngagementStats(getIsAuthenticated: () => boolean) {
  async function loadStatsForItems(
    items: Array<{ id: string | number; likeCount?: number; commentCount?: number }>,
  ) {
    if (!getIsAuthenticated() || items.length === 0) return

    try {
      const response = await $fetch<{
        success: boolean
        stats: Record<string, { likeCount: number; commentCount: number }>
      }>('/api/gallery/stats', {
        method: 'POST',
        body: { itemIds: items.map((item) => String(item.id)) },
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
      console.error('[GalleryStats] Failed to load batch stats:', error)
    }
  }

  async function refreshItemStats(
    itemId: string | number,
    items: Array<{ id: string | number; likeCount?: number; commentCount?: number }>,
  ) {
    const item = items.find((entry) => String(entry.id) === String(itemId))
    if (!item) return
    await loadStatsForItems([item])
  }

  return { loadStatsForItems, refreshItemStats }
}
