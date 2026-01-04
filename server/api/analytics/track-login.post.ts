import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import { useRuntimeConfig } from '#imports'
import { withTransaction } from '~/server/utils/db'
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
    // Match the fallback logic used in getPool() - check both config and process.env
    const config = useRuntimeConfig()
    const databaseUrl = config.databaseUrl || process.env.DATABASE_URL
    if (!databaseUrl) {
      console.warn('[API] DATABASE_URL not configured, skipping login tracking')
      return { success: false, error: 'Database not configured' }
    }

    // Check if we're in build mode - skip database operations during build
    const isBuildMode = process.env.NUXT_BUILD === 'true' || process.env.BUILD === 'true'
    if (isBuildMode) {
      console.warn('[API] Skipping login tracking during build')
      return { success: false, error: 'Cannot track login during build' }
    }

    // Atomically insert login and determine if this is a new user using a transaction
    // This prevents race conditions when concurrent requests arrive for the same email
    // by using PostgreSQL advisory locks to ensure only one request can check and insert at a time
    const isNewUser = await withTransaction(async (client) => {
      // Use advisory lock based on email hash to prevent concurrent access for the same email
      // This ensures only one transaction can check and insert for a given email at a time
      // pg_advisory_xact_lock automatically releases when the transaction ends
      // Note: hashtext() returns integer, but pg_advisory_xact_lock() requires bigint, so we cast it
      const lockResult = await client.query<{ lock_key: number }>(
        `SELECT hashtext($1)::bigint as lock_key`,
        [userEmail],
      )
      const lockKey = lockResult.rows[0]?.lock_key || 0
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey])

      // Check if user exists (now safely locked)
      // Cast COUNT(*) to integer to ensure pg library returns it as a number
      const existingCheck = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM user_logins WHERE user_email = $1`,
        [userEmail],
      )
      const existingCount = existingCheck.rows[0]?.count ?? 0
      const isNew = existingCount === 0

      // Insert the login record
      await client.query(
        `INSERT INTO user_logins (user_email, user_name, login_location, user_agent, browser, ip_address, country, referer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userEmail, userName, loginLocation, userAgent, browser, ip, country, referer],
      )

      return isNew
    })

    // Send email alert for new users (fire and forget - don't block the response)
    // Note: sendNewUserAlert currently handles all errors internally, but we add a catch handler
    // as a safety measure to prevent unhandled promise rejections if the function is modified in the future
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
        // Safety catch: log any unexpected errors (should not happen with current implementation)
        console.error('[API] Unexpected error in sendNewUserAlert (this should not occur):', error)
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
