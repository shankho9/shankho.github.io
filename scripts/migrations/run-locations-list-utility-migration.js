#!/usr/bin/env node
/**
 * Add locations-list utility to utility_access_config
 * Usage:
 *   Development: node scripts/migrations/run-locations-list-utility-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-locations-list-utility-migration.js
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
  console.warn(`⚠️  Warning: ${envFile} not found. Using environment variables from system.`)
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
    const path = join(process.cwd(), 'server/db/migrations/add_locations_list_utility.sql')
    const sql = readFileSync(path, 'utf-8')
    console.log('🚀 Running locations-list utility migration...')
    const client = await pool.connect()
    try {
      await client.query(sql)
      console.log('✅ locations-list utility added')
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
