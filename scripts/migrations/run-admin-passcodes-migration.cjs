#!/usr/bin/env node
/**
 * Create admin_passcodes table (distinct from utility_passcodes).
 * Usage:
 *   Development: node scripts/migrations/run-admin-passcodes-migration.cjs
 *   Production: NODE_ENV=production node scripts/migrations/run-admin-passcodes-migration.cjs
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const pg = require('pg')

const isProduction = process.env.NODE_ENV === 'production'
const envFile = isProduction ? '.env.production' : '.env'

if (existsSync(envFile)) {
  require('dotenv').config({ path: envFile })
  console.log(`📄 Loaded environment from: ${envFile}`)
} else {
  console.warn(`⚠️  Warning: ${envFile} not found. Using system env.`)
}

const { Pool } = pg

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`)
  const clean = databaseUrl.trim().replace(/^["']|["']$/g, '')
  const pool = new Pool({
    connectionString: clean,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')
    const path = join(process.cwd(), 'server/db/migrations/create_admin_passcodes.sql')
    const sql = readFileSync(path, 'utf-8')
    console.log('🚀 Running admin_passcodes migration...')
    const client = await pool.connect()
    try {
      await client.query(sql)
      console.log('✅ admin_passcodes table created')
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
