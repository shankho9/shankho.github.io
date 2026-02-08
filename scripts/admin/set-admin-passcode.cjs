#!/usr/bin/env node
/**
 * Insert/update admin passcode in admin_passcodes table for basu.net@gmail.com.
 * Uses ADMIN_PASSWORD_HASH from env (bcrypt hash).
 *
 * Usage:
 *   Local:    node scripts/admin/set-admin-passcode.cjs
 *   Prod:     NODE_ENV=production node scripts/admin/set-admin-passcode.cjs
 */

const { existsSync } = require('fs')
const { config } = require('dotenv')
const { Pool } = require('pg')

const ADMIN_EMAIL = 'basu.net@gmail.com'
const PASSCODE_DURATION_DAYS = 90

const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'

if (existsSync(envFile)) {
  config({ path: envFile })
  console.log(`📄 Loaded: ${envFile}`)
}

const hash = process.env.ADMIN_PASSWORD_HASH
if (!hash || !hash.trim()) {
  console.error('❌ ADMIN_PASSWORD_HASH not set in', envFile)
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set in', envFile)
  process.exit(1)
}

async function run() {
  const pool = new Pool({
    connectionString: databaseUrl.trim().replace(/^["']|["']$/g, ''),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [ADMIN_EMAIL]
    )
    if (userRes.rows.length === 0) {
      console.error(`❌ User not found: ${ADMIN_EMAIL}`)
      process.exit(1)
    }
    const userId = userRes.rows[0].id

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + PASSCODE_DURATION_DAYS)

    await pool.query(
      `INSERT INTO admin_passcodes (user_id, passcode_hash, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         passcode_hash = EXCLUDED.passcode_hash,
         expires_at = EXCLUDED.expires_at,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, hash.trim(), expiresAt]
    )

    console.log(`✅ Admin passcode set for ${ADMIN_EMAIL} (user_id=${userId})`)
    console.log(`   Expires: ${expiresAt.toISOString().slice(0, 10)}`)
  } finally {
    await pool.end()
  }
}

run().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
