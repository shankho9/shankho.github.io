#!/usr/bin/env node
/**
 * Run authentication tables migration
 * Usage:
 *   Development: node scripts/migrations/run-auth-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-auth-migration.js
 */

const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const pg = require('pg')

// Load environment variables
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

  // Remove quotes if present (sometimes .env files have quotes)
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    // Read the migration file
    const migrationPath = join(process.cwd(), 'server/db/migrations/create_auth_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    console.log('   Migration file:', migrationPath)

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed successfully!')
      console.log('✅ Created tables: users, sessions, devices, utility_passcodes')
    } finally {
      client.release()
    }

    // Verify the tables were created
    const verifyClient = await pool.connect()
    try {
      const tables = ['users', 'sessions', 'devices', 'utility_passcodes']
      for (const table of tables) {
        const result = await verifyClient.query(
          `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        `,
          [table],
        )

        if (result.rows.length > 0) {
          console.log(`✅ Verification: ${table} table exists`)
        } else {
          console.log(`⚠️  Warning: Could not verify ${table} table creation`)
        }
      }
    } finally {
      verifyClient.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42P07') {
      console.error(
        "   Note: Tables might already exist. This is okay if you're re-running the migration.",
      )
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
