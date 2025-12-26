import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import { useRuntimeConfig } from '#imports'
import { query } from '~/server/utils/db'
import { sendNewUserAlert } from '~/server/utils/email'

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
    // Check if database is configured
    const config = useRuntimeConfig()
    if (!config.databaseUrl) {
      console.warn('[API] DATABASE_URL not configured, skipping login tracking')
      return { success: false, error: 'Database not configured' }
    }

    // Check if this is a new user (first login for this email)
    const existingLogins = await query<{ id: number }>(
      `SELECT id FROM user_logins WHERE user_email = $1 LIMIT 1`,
      [userEmail],
    )

    const isNewUser = existingLogins.length === 0

    // Insert the login record
    await query(
      `INSERT INTO user_logins (user_email, user_name, login_location, user_agent, browser, ip_address, country, referer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userEmail, userName, loginLocation, userAgent, browser, ip, country, referer],
    )

    // Send email alert for new users (fire and forget - don't block the response)
    if (isNewUser) {
      sendNewUserAlert({
        userEmail,
        userName,
        loginLocation,
        ipAddress: ip,
        country: country || undefined,
        browser: browser || undefined,
        userAgent: userAgent || undefined,
      }).catch((error) => {
        // Log error but don't fail the login
        console.error('[API] Failed to send new user alert email:', error)
      })
    }

    return { success: true, isNewUser }
  } catch (err) {
    console.error('[API] Failed to track login:', err)
    if (err instanceof Error) {
      console.error('[API] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      })
      
      // Provide helpful error message for missing DATABASE_URL
      if (err.message.includes('DATABASE_URL is not configured')) {
        console.error('[API] Please set DATABASE_URL environment variable')
      }
    }
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
