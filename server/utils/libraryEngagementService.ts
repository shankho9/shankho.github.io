import { UAParser } from 'ua-parser-js'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { query } from '~/server/utils/db'
import { getClientIP } from '~/server/utils/getClientIP'
import {
  fromLibraryPostId,
  parseLibraryEngagementKind,
  toLibraryPostId,
  type LibraryEngagementKind,
} from '~/server/utils/libraryEngagement'

export interface ItemEngagementStats {
  likeCount: number
  commentCount: number
}

export async function getLibraryLikeState(
  event: H3Event,
  kind: LibraryEngagementKind,
  itemId: string,
): Promise<{ success: true; count: number; isLiked: boolean }> {
  const postId = toLibraryPostId(kind, itemId)

  const countRows = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND deleted_at IS NULL',
    [postId],
  )
  const count = parseInt(countRows[0]?.count ?? '0', 10)

  const userIp = getClientIP(event)
  const likeRows = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = $1 AND user_ip = $2 AND deleted_at IS NULL',
    [postId, userIp],
  )
  const isLiked = parseInt(likeRows[0]?.count ?? '0', 10) > 0

  return { success: true, count, isLiked }
}

export async function setLibraryLike(
  event: H3Event,
  kind: LibraryEngagementKind,
  itemId: string,
  action: 'like' | 'unlike',
): Promise<{ success: true }> {
  const postId = toLibraryPostId(kind, itemId)
  const userIp = getClientIP(event)
  const userAgent = getHeader(event, 'user-agent') || 'unknown'
  const country = getHeader(event, 'cf-ipcountry') || 'unknown'

  const parser = new UAParser(userAgent)
  const browser = parser.getBrowser().name || 'Unknown'
  const os = parser.getOS().name || 'Unknown'
  const device = parser.getDevice().type || 'desktop'

  if (action === 'like') {
    await query(
      `
      INSERT INTO likes (post_id, user_ip, user_agent, deleted_at, country, browser, os, device)
      VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)
      ON CONFLICT (post_id, user_ip) DO UPDATE
      SET deleted_at = NULL, user_agent = $3, country = $4, browser = $5, os = $6, device = $7
      `,
      [postId, userIp, userAgent, country, browser, os, device],
    )
  } else {
    await query(`UPDATE likes SET deleted_at = NOW() WHERE post_id = $1 AND user_ip = $2`, [
      postId,
      userIp,
    ])
  }

  return { success: true }
}

export async function batchLibraryStats(
  kind: LibraryEngagementKind,
  rawIds: Array<string | number>,
): Promise<Record<string, ItemEngagementStats>> {
  const itemIds = [...new Set(rawIds.map((id) => String(id)))].slice(0, 100)
  const stats: Record<string, ItemEngagementStats> = Object.fromEntries(
    itemIds.map((id) => [id, { likeCount: 0, commentCount: 0 }]),
  )

  if (itemIds.length === 0) return stats

  const postIds = itemIds.map((id) => toLibraryPostId(kind, id))

  const likeRows = await query<{ post_id: string; count: string }>(
    `SELECT post_id, COUNT(*)::text AS count
     FROM likes
     WHERE post_id = ANY($1::text[]) AND deleted_at IS NULL
     GROUP BY post_id`,
    [postIds],
  )

  for (const row of likeRows) {
    const itemId = fromLibraryPostId(kind, row.post_id)
    if (itemId && stats[itemId]) {
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
    const itemId = fromLibraryPostId(kind, row.post_id)
    if (itemId && stats[itemId]) {
      stats[itemId].commentCount = parseInt(row.count ?? '0', 10)
    }
  }

  return stats
}

export { parseLibraryEngagementKind, toLibraryPostId }
