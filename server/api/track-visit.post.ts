import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import type { Pool } from 'pg'

let pool: Pool | null = null

export default defineEventHandler(async (event) => {
  if (!pool) {
    const pg = await import('pg')
    pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }

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
      console.warn('GeoIP failed', e)
    }
  }

  try {
    await pool.query(
      `INSERT INTO page_visits (page, user_agent, browser, referer, ip_address, country)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [page, userAgent, browser, referer, ip, country],
    )
  } catch (err) {
    console.error('DB insert error:', err)
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
