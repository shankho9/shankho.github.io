#!/usr/bin/env node
/**
 * Run user role migration (visitor / admin)
 * 1. Adds role column to users table (default: visitor)
 * 2. Sets basu.net@gmail.com as admin on this environment
 * 3. All other users remain visitors
 *
 * Usage:
 *   Development (localhost): node scripts/migrations/run-user-role-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-user-role-migration.js
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const pg = require('pg')

const ADMIN_EMAIL = 'basu.net@gmail.com'

const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'

if (existsSync(envFile)) {
  require('dotenv').config({ path: envFile })
  console.log(`📄 Loaded environment from: ${envFile}`)
} else {
  console.warn(`⚠️  Warning: ${envFile} not found. Using environment variables from system.`)
}

const { Pool } = pg

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    console.error(`   Please set it in your ${envFile} file or environment`)
    console.error(`   Current environment: ${isProduction ? 'production' : 'development'}`)
    process.exit(1)
  }

  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`)
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`)

  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    const client = await pool.connect()

    try {
      // Step 1: Run add_user_role migration
      console.log('\n📋 Step 1: Running add_user_role migration...')
      const migrationPath = join(process.cwd(), 'server/db/migrations/add_user_role.sql')
      const migrationSQL = readFileSync(migrationPath, 'utf-8')
      await client.query(migrationSQL)
      console.log('✅ Role column added (or already exists)')

      // Step 2: Ensure all users are visitor, then set admin for ADMIN_EMAIL
      console.log('\n📋 Step 2: Setting all users to visitor, then admin for', ADMIN_EMAIL)
      await client.query(`
        UPDATE users SET role = 'visitor' WHERE role IS DISTINCT FROM 'visitor';
      `)
      const updateResult = await client.query(
        `UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER($1) RETURNING id, email, role`,
        [ADMIN_EMAIL],
      )
      if (updateResult.rowCount > 0) {
        console.log(`✅ Set ${updateResult.rowCount} user(s) as admin: ${ADMIN_EMAIL}`)
      } else {
        console.log(
          `⚠️  No user found with email ${ADMIN_EMAIL}. They will be admin when they register.`,
        )
      }

      // Verify
      const verify = await client.query(
        `SELECT email, role FROM users ORDER BY role DESC, email LIMIT 10`,
      )
      console.log('\n📋 Current users (sample):')
      verify.rows.forEach((r) => console.log(`   ${r.email} → ${r.role}`))
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }

  console.log('\n✅ User role migration completed successfully!')
}

runMigration()
