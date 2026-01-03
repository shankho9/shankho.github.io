#!/usr/bin/env node
/**
 * Run planner database migrations
 * Usage:
 *   Development: node scripts/migrations/run-planner-migration.js
 *   Production: NODE_ENV=production node scripts/migrations/run-planner-migration.js
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
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('📦 Connecting to database...')

    // Read the migration file
    const migrationPath = join(process.cwd(), 'server/db/migrations/create_planner_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    console.log('   Migration file:', migrationPath)

    // Execute the migration
    const client = await pool.connect()
    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed successfully!')
      console.log('✅ Tasks and weekly_reviews tables created with indexes and triggers')
    } finally {
      client.release()
    }

    // Verify the tables were created
    const verifyClient = await pool.connect()
    try {
      const result = await verifyClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('tasks', 'weekly_reviews')
        ORDER BY table_name
      `)

      if (result.rows.length === 2) {
        console.log('✅ Verification: tasks and weekly_reviews tables exist')

        // Check indexes
        const indexResult = await verifyClient.query(`
          SELECT tablename, indexname 
          FROM pg_indexes 
          WHERE tablename IN ('tasks', 'weekly_reviews')
          ORDER BY tablename, indexname
        `)
        console.log(`✅ Found ${indexResult.rows.length} indexes`)
      } else {
        console.log('⚠️  Warning: Could not verify table creation')
      }
    } finally {
      verifyClient.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42P07') {
      console.error(
        "   Note: Table might already exist. This is okay if you're re-running the migration.",
      )
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
