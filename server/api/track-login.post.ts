import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userEmail, userName, loginLocation } = body

  // Validate required fields
  if (!userEmail || !userName || !loginLocation) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: 'Missing required fields: userEmail, userName, loginLocation',
    }
  }

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
      console.warn('[API] GeoIP lookup failed for login tracking:', e)
    }
  }

  try {
    await query(
      `INSERT INTO user_logins (user_email, user_name, login_location, user_agent, browser, ip_address, country, referer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userEmail, userName, loginLocation, userAgent, browser, ip, country, referer],
    )

    return { success: true }
  } catch (err) {
    console.error('[API] Failed to track login:', err)
    // Don't fail the login if tracking fails
    return { success: false, error: 'Failed to track login event' }
  }
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
