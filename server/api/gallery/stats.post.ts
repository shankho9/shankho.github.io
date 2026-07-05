import { createError, defineEventHandler, readBody } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

interface StatsBody {
  itemIds?: Array<string | number>
}

interface ItemStats {
  likeCount: number
  commentCount: number
}

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody<StatsBody>(event)
  const rawIds = body?.itemIds

  if (!rawIds?.length) {
    return { success: true, stats: {} as Record<string, ItemStats> }
  }

  const itemIds = [...new Set(rawIds.map((id) => String(id)))].slice(0, 100)
  const postIds = itemIds.map((id) => `gallery_${id}`)

  const stats: Record<string, ItemStats> = Object.fromEntries(
    itemIds.map((id) => [id, { likeCount: 0, commentCount: 0 }]),
  )

  try {
    const likeRows = await query<{ post_id: string; count: string }>(
      `SELECT post_id, COUNT(*)::text AS count
       FROM likes
       WHERE post_id = ANY($1::text[]) AND deleted_at IS NULL
       GROUP BY post_id`,
      [postIds],
    )

    for (const row of likeRows) {
      const itemId = row.post_id.replace(/^gallery_/, '')
      if (stats[itemId]) {
        stats[itemId].likeCount = parseInt(row.count ?? '0', 10)
      }
    }

    const commentRows = await query<{ post_id: string; count: string }>(
      `SELECT post_id, COUNT(*)::text AS count
       FROM comments
       WHERE post_id = ANY($1::text[]) AND deleted_at IS NULL
       GROUP BY post_id`,
      [postIds],
    )

    for (const row of commentRows) {
      const itemId = row.post_id.replace(/^gallery_/, '')
      if (stats[itemId]) {
        stats[itemId].commentCount = parseInt(row.count ?? '0', 10)
      }
    }

    return { success: true, stats }
  } catch (error: unknown) {
    console.error('[API] Failed to batch-load gallery stats:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to load gallery stats',
    })
  }
})
