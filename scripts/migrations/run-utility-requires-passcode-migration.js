#!/usr/bin/env node
/**
 * Add requires_passcode column to utility_access_config
 * Usage:
 *   Development: node scripts/migrations/run-utility-requires-passcode-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-utility-requires-passcode-migration.js
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
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`)
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')
  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')
    const migrationPath = join(
      process.cwd(),
      'server/db/migrations/add_utility_requires_passcode.sql',
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('🚀 Running requires_passcode migration...')
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ requires_passcode column added and seeded')
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
