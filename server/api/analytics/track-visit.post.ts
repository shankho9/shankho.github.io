import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const page = body?.page || 'unknown'

  const ip = getRequestIP(event)
  const isLocal = isLocalhost(ip)

  const userAgent = event.node.req.headers['user-agent'] || ''
  const referer = event.node.req.headers['referer'] || ''

  const parser = new UAParser(userAgent)
  const parsedUA = parser.getResult()
  const browser = `${parsedUA.browser.name || ''} ${parsedUA.browser.version || ''}`

  let country = ''
  if (!isLocal && ip) {
    try {
      const geoRes = await $fetch<{ country_name?: string }>(`https://ipapi.co/${ip}/json/`)
      country = geoRes.country_name || ''
    } catch (e) {
      console.warn('[API] GeoIP lookup failed:', e)
    }
  }

  try {
    await query(
      `INSERT INTO page_visits (page, user_agent, browser, referer, ip_address, country)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [page, userAgent, browser, referer, ip, country],
    )
  } catch (err: unknown) {
    // Check if it's a connection timeout error
    if (err instanceof Error) {
      if (err.message.includes('ETIMEDOUT') || err.message.includes('timeout')) {
        // Silently fail for timeout errors - tracking is non-critical
        return { success: false, error: 'timeout' }
      }
    }
    // Log other errors but don't throw - tracking is non-critical
    console.error('[API] Failed to track page visit:', err)
  }

  return { success: true }
})

function getRequestIP(event: H3Event): string | undefined {
  const forwarded = event.node.req.headers['x-forwarded-for']
  return Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(',')[0] || event.node.req.socket.remoteAddress || ''
}

function isLocalhost(ip: string | undefined): boolean {
  return ip === '::1' || ip?.startsWith('127.') || ip === 'localhost' || ip === '::ffff:127.0.0.1'
}
