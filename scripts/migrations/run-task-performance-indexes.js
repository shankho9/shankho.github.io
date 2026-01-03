#!/usr/bin/env node
/**
 * Run task performance indexes migration
 * This script adds performance indexes to the tasks table for better query performance
 *
 * Usage:
 *   Development: node scripts/migrations/run-task-performance-indexes.js
 *   Production: NODE_ENV=production node scripts/migrations/run-task-performance-indexes.js
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
    process.exit(1)
  }

  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`)

  // Remove quotes if present
  const cleanDatabaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

  const pool = new Pool({
    connectionString: cleanDatabaseUrl,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()

  try {
    console.log('📦 Connecting to database...')

    await client.query('BEGIN')
    console.log('🔄 Starting transaction...')

    // Read the migration file
    console.log('\n📋 Running performance indexes migration...')
    const migrationPath = join(
      process.cwd(),
      'server/db/migrations/add_task_performance_indexes.sql',
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    try {
      await client.query(migrationSQL)
      console.log('✅ Migration completed: Performance indexes added')
    } catch (error) {
      if (error.code === '42P07') {
        console.log('⚠️  Some indexes already exist (this is okay)')
      } else {
        throw error
      }
    }

    await client.query('COMMIT')
    console.log('\n✅ All migrations completed successfully!')

    // Verify the indexes
    console.log('\n🔍 Verifying indexes...')
    const verifyResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'tasks' 
      AND indexname LIKE 'idx_tasks_%'
      ORDER BY indexname
    `)

    console.log(`✅ Found ${verifyResult.rows.length} performance indexes:`)
    verifyResult.rows.forEach((row) => {
      console.log(`   - ${row.indexname}`)
    })

    console.log('\n🎉 Performance indexes migration completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:', error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
