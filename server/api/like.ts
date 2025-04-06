// server/api/like.ts
import { readBody, defineEventHandler, getHeader } from 'h3'
import { UAParser } from 'ua-parser-js'
import { query } from '~/server/utils/db'
import { getClientIP } from '~/server/utils/getClientIP'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { postId, action } = body

  if (!postId || !['like', 'unlike'].includes(action)) {
    return { success: false, message: 'Missing or invalid postId/action' }
  }

  const userIp = getClientIP(event)
  const userAgent = getHeader(event, 'user-agent') || 'unknown'
  const country = getHeader(event, 'cf-ipcountry') || 'unknown'

  const parser = new UAParser(userAgent)
  const browser = parser.getBrowser().name || 'Unknown'
  const os = parser.getOS().name || 'Unknown'
  const device = parser.getDevice().type || 'desktop' // Defaults to desktop if type is undefined

  try {
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
    } else if (action === 'unlike') {
      await query(`UPDATE likes SET deleted_at = NOW() WHERE post_id = $1 AND user_ip = $2`, [
        postId,
        userIp,
      ])
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Like error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
