#!/usr/bin/env node
/**
 * Run utility_access_config migration
 * Usage:
 *   Development: node scripts/migrations/run-utility-access-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-utility-access-migration.js
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
    console.error(`   Please set it in your ${envFile} file or environment`)
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
      'server/db/migrations/create_utility_access_config.sql',
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('🚀 Running utility_access_config migration...')
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ utility_access_config table created and seeded')
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
